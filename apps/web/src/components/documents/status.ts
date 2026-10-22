import type { Household, Policy } from '@kavach/schemas';

const HEALTH = new Set<Policy['kind']>([
  'group_health',
  'retail_health',
  'super_top_up',
  'medishield_life',
  'integrated_shield',
]);

export const isHealth = (policy: Pick<Policy, 'kind'>) => HEALTH.has(policy.kind);

/** Where a policy stands on the household's date (the demo clock, or today). */
export function policyStatus(policy: Policy, household: Household) {
  const today = household.asOf ?? new Date().toISOString().slice(0, 10);
  if (policy.startDate > today) return 'planned';
  if (policy.endDate < today) return 'ended';
  const daysLeft = (Date.parse(policy.endDate) - Date.parse(today)) / 86_400_000;
  return daysLeft <= 45 ? 'ending' : 'active';
}
