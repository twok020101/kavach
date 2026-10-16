import type { RuleFiring } from '@kavach/schemas';

type Source = { title: string; url?: string };
type Status = 'verified' | 'to_verify';

export type Rule = {
  id: string;
  name: string;
  statement: string;
  /** 'to_verify' until a human checks the paragraph in the primary source and flips it. */
  status: Status;
  sources: Source[];
};

const IRDAI_2020: Source = {
  title: 'IRDAI circular IRDAI/HLT/REG/CIR/151/06/2020 (proportionate deductions)',
  url: 'https://www.business-standard.com/article/companies/out-of-pocket-expenses-of-policyholders-to-fall-after-new-irdai-guidelines-120061200007_1.html',
};
const IRDAI_2024: Source = {
  title: 'IRDAI Master Circular on Health Insurance Business, 29 May 2024',
  url: 'https://irdai.gov.in/documents/37343/365525/%e0%a4%b8%e0%a5%8d%e0%a4%b5%e0%a4%be%e0%a4%b8%e0%a5%8d%e0%a4%a5%e0%a5%8d%e0%a4%af+%e0%a4%ac%e0%a5%80%e0%a4%ae%e0%a4%be+%e0%a4%b5%e0%a5%8d%e0%a4%af%e0%a4%b5%e0%a4%b8%e0%a4%be%e0%a4%af+%e0%a4%aa%e0%a4%b0+%e0%a4%ae%e0%a4%be%e0%a4%b8%e0%a5%8d%e0%a4%9f%e0%a4%b0+%e0%a4%aa%e0%a4%b0%e0%a4%bf%e0%a4%aa%e0%a4%a4%e0%a5%8d%e0%a4%b0+_+Master+Circular++on+Health++Insurance+Business++29052024.pdf/5e707a91-b5de-1ec1-cf18-b66273a6839d?t=1716962621002&version=1.0',
};
const WORDING: Source = { title: "The policy's own wording (terms extracted with citations)" };
const HEURISTIC: Source = { title: 'Kavach planning heuristic (docs/plan/05), not regulation' };
const BENEFITS: Source = {
  title: "The employer's group health benefits summary (migration clause); check with HR",
};

const list: Rule[] = [
  {
    id: 'R-HL-001',
    name: 'Proportionate deduction only on room-priced heads',
    statement:
      'If room rent per day is above the limit and the hospital bills by room category, only the heads the tariff prices by room category are reduced by limit / actual rent. Pharmacy, consumables, implants, devices, diagnostics and ICU are never reduced.',
    status: 'to_verify',
    sources: [IRDAI_2020, IRDAI_2024],
  },
  {
    id: 'R-HL-002',
    name: 'ICU is never proportionately deducted',
    statement:
      "ICU charges are never proportionately deducted. ICU rent is still capped at the wording's ICU limit, if it has one.",
    status: 'to_verify',
    sources: [IRDAI_2020, IRDAI_2024],
  },
  {
    id: 'R-HL-003',
    name: 'Co-pay on the admissible amount',
    statement: 'Co-pay is applied to the admissible amount after all deductions.',
    status: 'verified',
    sources: [WORDING],
  },
  {
    id: 'R-HL-005',
    name: 'Non-payable items excluded',
    statement: 'Items on the non-payable list are not admissible.',
    status: 'to_verify',
    sources: [IRDAI_2024, WORDING],
  },
  {
    id: 'R-HL-006',
    name: 'Choice of policy order',
    statement:
      'With several policies the insured chooses which to claim from first and claims the balance from the next. Kavach picks the order with the lowest out-of-pocket.',
    status: 'to_verify',
    sources: [IRDAI_2024],
  },
  {
    id: 'R-HL-008',
    name: 'Room rent capped at the limit',
    statement:
      'Room rent above the per-day limit is not admissible; the excess is paid by the family.',
    status: 'verified',
    sources: [WORDING],
  },
  {
    id: 'R-HL-009',
    name: 'Super top-up pays only above its deductible',
    statement:
      'A super top-up pays only on the amount above its deductible for the policy year; amounts already paid by other policies count toward the deductible.',
    status: 'verified',
    sources: [WORDING],
  },
  {
    id: 'R-HL-010',
    name: 'Billing type unknown: both branches and one question',
    statement:
      'When it is not known whether the hospital bills by room category, compute both branches (differential and flat) and ask the desk one question before giving a single number.',
    status: 'verified',
    sources: [IRDAI_2020],
  },
  {
    id: 'R-HL-014',
    name: 'Package rate: no ratio, ask for the lower-category price',
    statement:
      'For a package rate Kavach applies no proportionate deduction itself; it asks the desk for the package price in the room within the limit.',
    status: 'verified',
    sources: [IRDAI_2020],
  },
  {
    id: 'R-CLM-001',
    name: 'Deduction when the room was within the limit',
    statement:
      'A proportionate deduction applied when the room rent was within the limit is challengeable.',
    status: 'to_verify',
    sources: [IRDAI_2020, IRDAI_2024],
  },
  {
    id: 'R-CLM-002',
    name: 'Deduction on excluded heads',
    statement:
      'A proportionate deduction applied to pharmacy, consumables, implants, devices or diagnostics is challengeable.',
    status: 'to_verify',
    sources: [IRDAI_2020, IRDAI_2024],
  },
  {
    id: 'R-CLM-004',
    name: 'Consumables deducted',
    statement:
      'Consumables that are part of the procedure may be payable; the deduction is possibly recoverable depending on the wording.',
    status: 'to_verify',
    sources: [IRDAI_2024, WORDING],
  },
  {
    id: 'R-CLM-005',
    name: 'Co-pay base and rate',
    statement: 'Co-pay must be the policy rate applied to the bill after deductions.',
    status: 'verified',
    sources: [WORDING],
  },
  {
    id: 'R-CLM-006',
    name: 'Vague deduction reason',
    statement:
      'A deduction with no clause behind it is possibly recoverable; ask the insurer for the clause.',
    status: 'to_verify',
    sources: [IRDAI_2024],
  },
  {
    id: 'R-CLM-008',
    name: 'Deduction on ICU or without differential billing',
    statement:
      'A proportionate deduction applied to ICU charges, or at a hospital that does not bill by room category, is challengeable.',
    status: 'to_verify',
    sources: [IRDAI_2020, IRDAI_2024],
  },
  // Planning heuristics behind the cover map and plan (docs/plan/05 §3–§8).
  {
    id: 'R-HN-010',
    name: 'Nuclear family health need',
    statement:
      'Self, spouse and children need a family health floater of ₹10,00,000 in a tier-1 city.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-HN-011',
    name: "Parents' health need",
    statement:
      'Parents need health cover of their own, separate from the nuclear floater: ₹10,00,000 per pair, ₹5,00,000 at the least.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-HN-012',
    name: 'Employer cover is contingent',
    statement:
      "Employer group health counts toward the need, but only while the job lasts: a cell met only with it is 'depends on job'.",
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-HN-013',
    name: 'Super top-up needs a base',
    statement:
      'A super top-up counts only when a base policy covers its deductible; without a base it pays nothing.',
    status: 'verified',
    sources: [HEURISTIC, WORDING],
  },
  {
    id: 'R-LF-001',
    name: 'Term life need',
    statement:
      'Life cover need = annual income × 12 (under 40; 10 in the 40s, 8 in the 50s) + loans + ₹25,00,000 per child under 18 − emergency fund, less existing life cover; recommend in steps of ₹25,00,000.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-LF-002',
    name: 'Savings plan is not term cover',
    statement:
      'Endowment and ULIP plans count at their sum assured, but they are mainly savings; their life cover is small for the premium.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-PA-001',
    name: 'Personal accident need',
    statement:
      'Each earner needs accident cover of 3 × annual income (at most ₹1,00,00,000); at least ₹50,00,000 when income is ₹15,00,000 or more.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-DV-001',
    name: 'Device protection',
    statement:
      'Devices worth ₹50,000 or more in their first 2 years can be protected. Low priority.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-BG-001',
    name: 'Monthly protection budget',
    statement:
      'Budget = the smaller of 20% of what is left after EMIs and fixed spending, and 10% of take-home pay; personal premiums already paid come out of it.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-OP-001',
    name: 'Most protection per rupee, most urgent first',
    statement:
      'Recommendations are ranked by urgency, then by weighted need closed per rupee of premium, and chosen while they fit the budget. Premiums are illustrative.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-SC-001',
    name: 'Safety score',
    statement:
      'Score = weighted share of each need that is covered; employer cover counts half because it ends with the job.',
    status: 'verified',
    sources: [HEURISTIC],
  },
  {
    id: 'R-MG-001',
    name: 'Migrate group cover before the last working day',
    statement:
      "Members of an employer's group health policy can ask to move to an individual policy, keeping their continuous cover, if the request reaches the insurer in time (Acme: 15 days before the last working day).",
    status: 'to_verify',
    sources: [BENEFITS, IRDAI_2024],
  },
];

export const RULES: Readonly<Record<string, Rule>> = Object.fromEntries(list.map((r) => [r.id, r]));

/** Records that a rule fired, with the inputs it read and what it produced. */
export function fire(
  ruleId: string,
  inputs: Record<string, unknown> = {},
  output: Record<string, unknown> = {},
): RuleFiring {
  const rule = RULES[ruleId];
  if (!rule) throw new Error(`Unknown rule ${ruleId}`);
  return {
    ruleId,
    statement: rule.statement,
    inputs,
    output,
    status: rule.status,
    sources: rule.sources,
  };
}
