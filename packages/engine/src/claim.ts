import type {
  AssessedDeduction,
  ClaimAssessment,
  ClaimBill,
  Policy,
  RuleFiring,
  SettlementLetter,
} from '@kavach/schemas';
import { formatInr, roundRupees } from './money';
import { fire } from './rules';

type LetterDeduction = SettlementLetter['deductions'][number];
type Category = NonNullable<LetterDeduction['category']>;
type Verdict = Pick<AssessedDeduction, 'verdict' | 'ruleId' | 'reason'> & { citationKey?: string };

/**
 * Reads each deduction on a settlement letter and says whether it is valid, challengeable
 * or possibly recoverable, and how much the family could get back after co-pay.
 */
export function assessClaim(
  letter: SettlementLetter,
  bill: ClaimBill,
  policy: Policy,
): ClaimAssessment {
  const terms = policy.terms;
  const rate = terms.copayFromAge === undefined || letter.copayApplied > 0 ? terms.copayPercent : 0;
  const trace: RuleFiring[] = [];

  const deductions: AssessedDeduction[] = letter.deductions.map((d) => {
    const v = judge(categorise(d), bill, policy);
    const recoverable = v.verdict === 'valid' ? 0 : roundRupees((d.amount * (100 - rate)) / 100);
    trace.push(
      fire(v.ruleId!, { label: d.label, amount: d.amount }, { verdict: v.verdict, recoverable }),
    );
    const citation = v.citationKey ? terms.citations[v.citationKey] : undefined;
    return {
      label: d.label,
      amount: d.amount,
      verdict: v.verdict,
      recoverable,
      ruleId: v.ruleId,
      reason: v.reason,
      citation,
    };
  });

  // R-CLM-005: co-pay must be the policy rate on the bill after deductions.
  const deducted = sum(letter.deductions.map((d) => d.amount));
  const expectedCopay = roundRupees(((bill.total - deducted) * rate) / 100);
  const approved = bill.total - deducted - expectedCopay;
  const overCharged = letter.copayApplied - expectedCopay;
  trace.push(
    fire(
      'R-CLM-005',
      { bill: bill.total, deducted, copayPercent: rate, copayApplied: letter.copayApplied },
      {
        expectedCopay,
        approved,
        letterApproved: letter.approvedAmount,
        matches: approved === letter.approvedAmount,
      },
    ),
  );
  if (overCharged > 0) {
    deductions.push({
      label: 'Co-pay above the policy rate',
      amount: overCharged,
      verdict: 'challengeable',
      recoverable: overCharged,
      ruleId: 'R-CLM-005',
      reason: `Co-pay should be ${rate}% of ${formatInr(bill.total - deducted)} = ${formatInr(expectedCopay)}, not ${formatInr(letter.copayApplied)}.`,
      citation: terms.citations.copayPercent,
    });
  }

  const recoverable = sum(deductions.map((d) => d.recoverable));
  return {
    deductions,
    recoverable,
    approved,
    expectedPayout: letter.approvedAmount + recoverable,
    trace,
  };
}

function categorise(d: LetterDeduction): Category {
  if (d.category) return d.category;
  const text = `${d.label} ${d.reasonGiven ?? ''}`.toLowerCase();
  if (/proportion/.test(text)) return 'proportionate';
  if (/non[- ]?payable|non[- ]?medical/.test(text)) return 'non_payable';
  if (/consumable/.test(text)) return 'consumables';
  if (/room rent|room charges/.test(text)) return 'room_excess';
  return 'other';
}

function judge(category: Category, bill: ClaimBill, policy: Policy): Verdict {
  const limit = policy.terms.roomRentLimitPerDay;
  const rent = bill.roomRentPerDay;
  const withinLimit = rent !== undefined && (limit === undefined || rent <= limit);
  const roomFacts =
    rent !== undefined && limit !== undefined
      ? ` (${formatInr(rent)}/day against a limit of ${formatInr(limit)}/day)`
      : '';

  switch (category) {
    case 'non_payable':
      return {
        verdict: 'valid',
        ruleId: 'R-HL-005',
        reason: 'These items are on the non-payable list.',
      };
    case 'consumables':
      return {
        verdict: 'possibly',
        ruleId: 'R-CLM-004',
        reason:
          'Consumables used for the procedure can be payable; check the wording clause on consumables.',
        citationKey: 'consumables',
      };
    case 'proportionate':
      if (bill.icuStay)
        return {
          verdict: 'challengeable',
          ruleId: 'R-CLM-008',
          reason: 'ICU charges are never proportionately deducted.',
        };
      if (bill.billingType === 'flat' || bill.billingType === 'package')
        return {
          verdict: 'challengeable',
          ruleId: 'R-CLM-008',
          reason:
            'The hospital does not price treatment by room category, so no proportionate deduction applies.',
        };
      if (withinLimit)
        return {
          verdict: 'challengeable',
          ruleId: 'R-CLM-001',
          reason: `The room was within the room-rent limit${roomFacts}, so no proportionate deduction applies.`,
          citationKey: 'roomRentLimitPerDay',
        };
      if (rent === undefined)
        return {
          verdict: 'possibly',
          ruleId: 'R-CLM-006',
          reason: 'Ask the insurer for the room rent used and the clause applied.',
        };
      return {
        verdict: 'valid',
        ruleId: 'R-HL-001',
        reason: `The room was above the limit${roomFacts}; check it was applied only to room-priced heads.`,
        citationKey: 'roomRentLimitPerDay',
      };
    case 'room_excess':
      return withinLimit
        ? {
            verdict: 'challengeable',
            ruleId: 'R-CLM-001',
            reason: `The room was within the limit${roomFacts}.`,
            citationKey: 'roomRentLimitPerDay',
          }
        : {
            verdict: 'valid',
            ruleId: 'R-HL-008',
            reason: `Room rent above the limit is not payable${roomFacts}.`,
          };
    default:
      return {
        verdict: 'possibly',
        ruleId: 'R-CLM-006',
        reason: 'No clause was given for this deduction; ask the insurer for it.',
      };
  }
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
