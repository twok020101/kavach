import type { Plan, PlanDiff } from '@kavach/schemas';

/** What changed between two plans: items added and dropped, spend, score and cover map cells. */
export function diff(before: Plan, after: Plan): PlanDiff {
  const selected = (plan: Plan) => plan.recommendations.filter((r) => r.status === 'selected');
  const wasSelected = new Set(selected(before).map((r) => r.id));
  const isSelected = new Set(selected(after).map((r) => r.id));

  return {
    fromPlanId: before.id,
    toPlanId: after.id,
    added: selected(after).filter((r) => !wasSelected.has(r.id)),
    removed: before.recommendations
      .filter((r) => wasSelected.has(r.id) && !isSelected.has(r.id))
      .map((r) => after.recommendations.find((a) => a.id === r.id) ?? r),
    monthlySpend: { before: before.monthlySpend, after: after.monthlySpend },
    budgetForNew: { before: before.budget.forNewMonthly, after: after.budget.forNewMonthly },
    score: { before: before.coverMap.score, after: after.coverMap.score },
    cellsChanged: after.coverMap.cells.flatMap((cell) => {
      const old = before.coverMap.cells.find(
        (c) => c.memberId === cell.memberId && c.risk === cell.risk,
      );
      return old && old.status !== cell.status
        ? [{ memberId: cell.memberId, risk: cell.risk, before: old.status, after: cell.status }]
        : [];
    }),
  };
}
