import type { BranchResult, HospitalEstimate, RoomOptionResult } from '@kavach/schemas';

type Translate = ((key: string, values?: Record<string, string | number>) => string) & {
  has: (key: string) => boolean;
};

/**
 * The engine names its deductions in English ("Proportionate deduction"); the desk shows them in
 * the session's language, by rule id. R-MT-001 has two outcomes (no benefit at all, or above the
 * limit), told apart by the engine's own label. Unknown rules keep the engine's words.
 */
export function deductionLabel(t: Translate, d: { ruleId: string; label: string }) {
  const key =
    d.ruleId === 'R-MT-001' && /^no /i.test(d.label)
      ? 'deduction.R-MT-001-none'
      : `deduction.${d.ruleId}`;
  return t.has(key) ? t(key) : d.label;
}

/** The quoted room (the first category on the estimate) and the engine's result for it. */
export function quotedOption(estimate: HospitalEstimate | undefined, result?: BranchResult) {
  const quoted = estimate?.roomCategories[0];
  const option = quoted ? result?.options.find((o) => o.roomCategoryId === quoted.id) : undefined;
  return { quoted, option };
}

/** The room Kavach recommends, and the costliest one for the family (the saving is measured from it). */
export function savingPair(result: BranchResult) {
  const pick = result.options.find((o) => o.roomCategoryId === result.recommendedRoomCategoryId);
  const costliest = result.options.reduce<RoomOptionResult | undefined>(
    (worst, o) => (!worst || o.outOfPocket > worst.outOfPocket ? o : worst),
    undefined,
  );
  return { pick, costliest };
}
