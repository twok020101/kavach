import type {
  ChangeSet,
  Household,
  Plan,
  PlanEvent,
  Policy,
  RuleFiring,
} from '@kavach/schemas';
import { budget } from './budget';
import { addDays, coverMap, inForce } from './cover-map';
import { optimise } from './optimise';
import { fire } from './rules';

const PLANNED_KINDS: readonly Policy['kind'][] = [
  'group_health',
  'retail_health',
  'super_top_up',
  'term_life',
  'personal_accident',
  'endowment',
];

/** Today in the household's world: the demo clock, or the real date. */
export const householdToday = (household: Household) =>
  household.asOf ?? new Date().toISOString().slice(0, 10);

/** Dates within a year of `asOf` on which a policy starts or ends: pins for the date scrubber. */
function events(household: Household, asOf: string): PlanEvent[] {
  const horizon = addDays(asOf, 365);
  const out: PlanEvent[] = [];
  for (const p of household.policies.filter((p) => PLANNED_KINDS.includes(p.kind))) {
    if (p.startDate > asOf && p.startDate <= horizon)
      out.push({ date: p.startDate, kind: 'cover_starts', policyId: p.id });
    if (p.endDate >= asOf && p.endDate < horizon)
      out.push({ date: p.endDate, kind: 'cover_ends', policyId: p.id });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** A short, stable fingerprint of the household's cover, so the same state gives the same plan id. */
function fingerprint(household: Household): string {
  const text = JSON.stringify([household.policies, household.members, household.finances]);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

/** Cover map, budget and recommendations for the household as of a date (docs/plan/05 §1). */
export function plan(household: Household, asOf: string = householdToday(household)): Plan {
  const map = coverMap(household, asOf);
  const { budget: b, trace: budgetTrace } = budget(household, asOf);
  const { recommendations, trace: optimiseTrace } = optimise(household, map, b.forNewMonthly);
  const inForceNow = household.policies.filter((p) => inForce(p, asOf));

  const reviews = [
    ...inForceNow
      .filter((p) => p.kind === 'endowment')
      .map((p) => ({ policyId: p.id, issue: 'savings_plan_not_term' as const })),
    ...inForceNow
      .filter(
        (p) =>
          p.kind === 'super_top_up' &&
          map.cells.some((c) => c.risk === 'health' && c.issues.includes('topup_without_base')),
      )
      .map((p) => ({ policyId: p.id, issue: 'topup_without_base' as const })),
  ];

  const trace: RuleFiring[] = [
    budgetTrace,
    optimiseTrace,
    fire('R-SC-001', {}, { score: map.score }),
  ];
  return {
    id: `plan_${asOf}_${fingerprint(household)}`,
    householdId: household.id,
    asOf,
    coverMap: map,
    budget: b,
    recommendations,
    monthlySpend: recommendations
      .filter((r) => r.status === 'selected')
      .reduce((sum, r) => sum + r.premiumMonthly, 0),
    reviews,
    events: events(household, asOf),
    trace,
  };
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const sameEmployer = (a: string | undefined, b: string) =>
  !!a && (a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase()));

/**
 * Applies a confirmed life change to the household: employer cover ends on the last working day,
 * and the new employer's group health (if offered and known) starts on the joining date.
 */
export function applyChangeSet(household: Household, changeSet: ChangeSet): Household {
  let policies = [...household.policies];
  for (const change of changeSet.changes) {
    if (change.type === 'employment_ended') {
      policies = policies.map((p) =>
        p.source === 'employer' &&
        p.holderMemberId === change.memberId &&
        sameEmployer(p.employer, change.employer) &&
        p.endDate > change.lastDay
          ? { ...p, endDate: change.lastDay }
          : p,
      );
    }
    if (change.type === 'employment_started') {
      const { groupHealth } = change;
      if (groupHealth.offered !== 'yes' || !groupHealth.sumInsured) continue;
      const id = `pol_gmc_${slug(change.employer)}`;
      policies = policies.filter((p) => p.id !== id);
      policies.push({
        id,
        kind: 'group_health',
        insurer: 'Not known yet',
        productName: `${change.employer} Group Health`,
        source: 'employer',
        employer: change.employer,
        holderMemberId: change.memberId,
        coveredMemberIds: groupHealth.coveredMemberIds ?? [change.memberId],
        sumInsured: groupHealth.sumInsured,
        claimsUsedThisYear: 0,
        startDate: change.startDate,
        endDate: addDays(addDays(change.startDate, 365), -1),
        terms: {
          copayPercent: 0,
          deductible: 0,
          proportionateDeduction: true,
          citations: {},
        },
      });
    }
  }
  return { ...household, policies };
}
