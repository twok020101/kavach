/** Formats whole rupees with Indian digit grouping: 150800 → "₹1,50,800". */
export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export type Country = 'IN' | 'SG';

/** Whole units in the market's currency: ₹1,50,800 in India, S$4,250 in Singapore. */
export function formatMoney(amount: number, country: Country = 'IN'): string {
  if (country === 'SG') return `S$${Math.round(amount).toLocaleString('en-SG')}`;
  return formatInr(amount);
}

/**
 * The one rounding rule for the engine: round half away from zero to whole rupees.
 * Apply it once, at the end of each calculation step, never in the middle of one.
 */
export function roundRupees(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}
