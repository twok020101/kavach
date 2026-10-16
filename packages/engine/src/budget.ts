import type { Budget, Household, RuleFiring } from '@kavach/schemas';
import { inForce } from './cover-map';
import { fire } from './rules';

// R-BG-001 parameters (planning heuristic).
const SHARE_OF_DISPOSABLE = 0.2;
const SHARE_OF_TAKE_HOME = 0.1;
const EMERGENCY_MONTHS = 3;

/** R-BG-001: how much a month the family can put toward new protection. */
export function budget(household: Household, asOf: string): { budget: Budget; trace: RuleFiring } {
  const f = household.finances ?? {
    takeHomeMonthly: 0,
    emiMonthly: 0,
    fixedSpendMonthly: 0,
    emergencyFund: 0,
  };
  const disposable = f.takeHomeMonthly - f.emiMonthly - f.fixedSpendMonthly;
  const total = Math.round(
    Math.max(0, Math.min(SHARE_OF_DISPOSABLE * disposable, SHARE_OF_TAKE_HOME * f.takeHomeMonthly)),
  );
  // Personal premiums the family already pays (employer-paid cover excluded).
  const existingAnnual = household.policies
    .filter((p) => p.source === 'personal' && inForce(p, asOf))
    .reduce((sum, p) => sum + (p.premiumAnnual ?? 0), 0);
  const existing = Math.round(existingAnnual / 12);

  const result: Budget = {
    takeHomeMonthly: f.takeHomeMonthly,
    disposableMonthly: disposable,
    totalMonthly: total,
    existingPremiumsMonthly: existing,
    forNewMonthly: Math.max(0, total - existing),
    thinEmergencyFund: f.emergencyFund < EMERGENCY_MONTHS * (f.emiMonthly + f.fixedSpendMonthly),
  };
  return {
    budget: result,
    trace: fire(
      'R-BG-001',
      { takeHome: f.takeHomeMonthly, emi: f.emiMonthly, fixedSpend: f.fixedSpendMonthly, existingAnnual },
      { ...result },
    ),
  };
}
