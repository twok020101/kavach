import type { Household, Member, Risk } from '@kavach/schemas';
import { roundRupees } from './money';

/** How much cover one member needs for one risk (docs/plan/05 §4). Zero means the risk does not apply. */
export type Need = {
  memberId: string;
  risk: Risk;
  amount: number;
  ruleIds: string[];
};

// Planning parameters (tier-1 city). Heuristics, not regulation.
export const NUCLEAR_HEALTH_NEED = 10_00_000;
export const PARENTS_HEALTH_NEED = 10_00_000;
const CHILD_EDUCATION_RESERVE = 25_00_000;
const PA_INCOME_MULTIPLE = 3;
const PA_MAX = 1_00_00_000;

export const isNuclear = (m: Member) => ['self', 'spouse', 'child'].includes(m.relation);
export const isParent = (m: Member) => ['parent', 'parent_in_law'].includes(m.relation);

/** The household income the life and accident needs replace; it belongs to the main earner. */
function earnerIncome(household: Household, member: Member): number {
  if (!member.earning || member.relation !== 'self') return 0;
  const finances = household.finances;
  return finances?.annualIncome ?? (finances ? finances.takeHomeMonthly * 12 : 0);
}

/** R-LF-001 multiple of income by age. */
function lifeMultiple(age: number) {
  if (age < 40) return 12;
  if (age < 50) return 10;
  if (age < 60) return 8;
  return 0;
}

function healthNeed(member: Member): Need {
  if (isNuclear(member))
    return { memberId: member.id, risk: 'health', amount: NUCLEAR_HEALTH_NEED, ruleIds: ['R-HN-010'] };
  if (isParent(member))
    return { memberId: member.id, risk: 'health', amount: PARENTS_HEALTH_NEED, ruleIds: ['R-HN-011'] };
  return { memberId: member.id, risk: 'health', amount: 0, ruleIds: [] };
}

/** Gross life need before existing cover: income replacement + loans + children's education − liquid savings. */
function lifeNeed(household: Household, member: Member): Need {
  const income = earnerIncome(household, member);
  const children = household.members.filter((m) => m.relation === 'child' && m.age < 18).length;
  const gross =
    income * lifeMultiple(member.age) +
    (household.finances?.loansOutstanding ?? 0) +
    children * CHILD_EDUCATION_RESERVE -
    (household.finances?.emergencyFund ?? 0);
  const amount = income > 0 && lifeMultiple(member.age) > 0 ? Math.max(0, roundRupees(gross)) : 0;
  return { memberId: member.id, risk: 'life', amount, ruleIds: amount ? ['R-LF-001'] : [] };
}

function accidentNeed(household: Household, member: Member): Need {
  const income = earnerIncome(household, member);
  const amount = Math.min(income * PA_INCOME_MULTIPLE, PA_MAX);
  return { memberId: member.id, risk: 'accident', amount, ruleIds: amount ? ['R-PA-001'] : [] };
}

/** Every member × risk need for the household. */
export function needs(household: Household): Need[] {
  return household.members.flatMap((member) => [
    healthNeed(member),
    lifeNeed(household, member),
    accidentNeed(household, member),
  ]);
}

/** R-OP-001 / R-SC-001 weights: how much a closed rupee of this need matters. */
export function weight(member: Member, risk: Risk): number {
  if (risk === 'life') return 1;
  if (risk === 'accident') return 0.5;
  return isParent(member) || member.age >= 60 ? 0.9 : 0.8;
}
