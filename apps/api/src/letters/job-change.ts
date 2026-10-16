import { randomUUID } from 'node:crypto';
import { addDays, formatInr } from '@kavach/engine';
import type { Action, ChangeSet, Household, LifeChange } from '@kavach/schemas';

/**
 * Days before the last working day by which the migration request must reach the insurer.
 * From the Acme benefits summary §9.1 (sample); rule R-MG-001 is to_verify, so screens say "check with HR".
 */
export const MIGRATION_NOTICE_DAYS = 15;

const BLANK = '[____]';

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** "Sharma family" → "Sharma". */
const surname = (household: Household) => household.name.replace(/\s+family$/i, '');

/**
 * Drafts the dated actions a job change needs, from the household as it was before the change:
 * the migration letter for anyone who loses group cover and has no new one, a WhatsApp reminder
 * on the letter's due date, and a reminder to send the new employer the family's details.
 */
export function draftJobChangeActions(
  household: Household,
  changeSet: ChangeSet,
  lifeChangeId: string,
  now = new Date(),
): Action[] {
  const actions: Action[] = [];
  const base = {
    householdId: household.id,
    status: 'draft' as const,
    lifeChangeId,
    createdAt: now.toISOString(),
  };
  const ended = changeSet.changes.filter(
    (c): c is Extract<LifeChange, { type: 'employment_ended' }> => c.type === 'employment_ended',
  );
  const started = changeSet.changes.filter(
    (c): c is Extract<LifeChange, { type: 'employment_started' }> =>
      c.type === 'employment_started',
  );
  const newlyCovered = new Set(
    started.flatMap((c) =>
      c.groupHealth.offered === 'yes' ? (c.groupHealth.coveredMemberIds ?? [c.memberId]) : [],
    ),
  );

  for (const end of ended) {
    const employee = household.members.find((m) => m.id === end.memberId);
    const group = household.policies.find(
      (p) =>
        p.kind === 'group_health' &&
        p.holderMemberId === end.memberId &&
        p.employer?.toLowerCase().includes(end.employer.toLowerCase().split(' ')[0]!),
    );
    if (!employee || !group) continue;
    // Members who lose cover and are not picked up by the new employer.
    const losing = household.members.filter(
      (m) => group.coveredMemberIds.includes(m.id) && !newlyCovered.has(m.id),
    );
    if (losing.length === 0) continue;

    const dueDate = addDays(end.lastDay, -MIGRATION_NOTICE_DAYS);
    const names = losing.map((m) => `${m.name} ${surname(household)}`);
    const nameList = names.join(' and ');
    const allParents = losing.every((m) => m.relation === 'parent');
    const coveredPeople = allParents
      ? `My ${losing.length > 1 ? 'parents' : 'parent'}, ${nameList}, ${losing.length > 1 ? 'are' : 'is'}`
      : `${nameList} ${losing.length > 1 ? 'are' : 'is'}`;
    const employer = group.employer ?? end.employer;
    const letterId = `act_${randomUUID()}`;
    actions.push({
      ...base,
      id: letterId,
      kind: 'migration_letter',
      title: `Ask ${employer} HR to move ${losing.map((m) => m.name).join(' and ')} to an individual policy`,
      dueDate,
      memberId: employee.id,
      recipient: `HR, ${employer} / ${group.insurer}`,
      content: [
        `Subject: Request to migrate group health cover to an individual policy – ${nameList}`,
        '',
        'Dear Sir/Madam,',
        '',
        `I am leaving ${employer}; my last working day is ${longDate(end.lastDay)} (employee ID ${BLANK}). ${coveredPeople} covered under the ${group.productName} policy with ${group.insurer} (policy number ${group.policyNumber ?? BLANK}), sum insured ${formatInr(group.sumInsured).replace('₹', 'Rs ')} family floater.`,
        '',
        `I request that ${losing.length > 1 ? 'their' : 'this'} cover be migrated to an individual health policy with ${group.insurer} from ${longDate(addDays(end.lastDay, 1))}, with credit for the time already covered under the group policy for waiting periods. Please send me the migration form and the premium, so that the request reaches the insurer at least ${MIGRATION_NOTICE_DAYS} days before my last working day.`,
        '',
        'Please confirm that you have received this request.',
        '',
        'Yours sincerely,',
        `${employee.name} ${surname(household)}`,
        `Phone: ${employee.phone ?? BLANK}`,
      ].join('\n'),
    });

    const who =
      allParents && losing.length === 2
        ? 'Mummy and Papa'
        : losing.map((m) => m.name).join(' and ');
    actions.push({
      ...base,
      id: `act_${randomUUID()}`,
      kind: 'reminder',
      title: `Ask ${employer} HR to migrate ${who}'s cover`,
      dueDate,
      memberId: employee.id,
      relatedActionId: letterId,
      content: `${shortDate(dueDate)}: ask ${employer} HR to migrate ${who}'s cover. The letter is ready, reply YES to get it as a PDF.`,
    });
  }

  for (const start of started) {
    if (start.groupHealth.offered !== 'yes') continue;
    const covered = household.members.filter((m) =>
      (start.groupHealth.coveredMemberIds ?? []).includes(m.id),
    );
    actions.push({
      ...base,
      id: `act_${randomUUID()}`,
      kind: 'reminder',
      title: `Send ${start.employer} HR your family's details for their health cover`,
      dueDate: start.startDate,
      memberId: start.memberId,
      content: `${shortDate(start.startDate)}: send ${start.employer} HR the details of ${covered.map((m) => m.name).join(', ')} for their group health cover.`,
    });
  }
  return actions;
}
