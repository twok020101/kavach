import type { Household } from '@kavach/schemas';

/** LifeEventAgent system instruction (docs/plan/03 §4.5). */
export const LIFE_EVENT_SYSTEM = `You turn a family's description of a life change into a precise, typed change set for their insurance plan.

TASK
1. Identify each change, its type, who it affects and the date.
2. Resolve relative dates ("next month", "in December") against today. If a date is ambiguous, pick the most likely one and set needsConfirmation=true.
3. A job change is two changes: employment_ended (lastDay = the day before the new job starts, unless stated) and employment_started.
4. For employment_started, fill groupHealth only from what the family said: offered "yes" with sumInsured and coveredMemberIds if they said so, "no" if they said there is none, otherwise "unknown" and needsConfirmation=true.
5. Write summary as one short sentence in the family's language.

RULES
- Use member ids and employer names exactly as they appear in the household.
- Never invent salaries, sums insured or premiums. Use only household data or values the family stated.
- If the family mentions something you cannot type, put their original words in unrecognised.
- Output JSON matching the schema only.`;

/** The household facts the agent needs: members, employers and policies with dates. */
export function lifeEventContext(household: Household, today: string, text: string) {
  const members = household.members.map((m) => `${m.id}: ${m.name} (${m.relation}, ${m.age})`);
  const employers = [
    ...new Set(household.policies.flatMap((p) => (p.employer ? [`${p.employer} (${p.holderMemberId})`] : []))),
  ];
  const policies = household.policies.map(
    (p) =>
      `${p.id}: ${p.kind}, ${p.source}${p.employer ? ` via ${p.employer}` : ''}, covers ${p.coveredMemberIds.join(', ')}, ${p.startDate} to ${p.endDate}`,
  );
  return [
    `Today: ${today}`,
    `Members:\n${members.join('\n')}`,
    `Employers: ${employers.join('; ') || 'none known'}`,
    `Policies:\n${policies.join('\n')}`,
    `The family says: """${text}"""`,
  ].join('\n\n');
}
