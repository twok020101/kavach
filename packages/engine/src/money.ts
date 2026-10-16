/** Formats whole rupees with Indian digit grouping: 150800 → "₹1,50,800". */
export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * The one rounding rule for the engine: round half away from zero to whole rupees.
 * Apply it once, at the end of each calculation step, never in the middle of one.
 */
export function roundRupees(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}
