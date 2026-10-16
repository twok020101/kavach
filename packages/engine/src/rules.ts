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
