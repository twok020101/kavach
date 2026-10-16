import { z } from 'zod';
import { Citation, RuleFiring, Rupees } from './common';
import { BillingType } from './hospital';

/** What the claim letter reader extracts from a settlement letter. */
export const SettlementLetter = z.object({
  insurer: z.string(),
  claimNumber: z.string(),
  policyNumber: z.string().optional(),
  patientName: z.string(),
  hospitalName: z.string(),
  billAmount: Rupees,
  approvedAmount: Rupees,
  deductions: z.array(
    z.object({
      label: z.string(),
      amount: Rupees,
      reasonGiven: z.string().optional(),
      /** Set by the letter reader when it can tell; the engine falls back to the label. */
      category: z
        .enum(['non_payable', 'proportionate', 'consumables', 'room_excess', 'other'])
        .optional(),
    }),
  ),
  copayApplied: Rupees.default(0),
  letterDate: z.string().date().optional(),
});
export type SettlementLetter = z.infer<typeof SettlementLetter>;

/** What the engine needs to know about the hospital bill behind a claim. */
export const ClaimBill = z.object({
  total: Rupees,
  roomRentPerDay: Rupees.optional(),
  billingType: BillingType.default('unknown'),
  /** True when the stay (or the deducted part of it) was in ICU. */
  icuStay: z.boolean().default(false),
});
export type ClaimBill = z.infer<typeof ClaimBill>;

export const DeductionVerdict = z.enum(['valid', 'challengeable', 'possibly']);

export const AssessedDeduction = z.object({
  label: z.string(),
  amount: Rupees,
  verdict: DeductionVerdict,
  recoverable: Rupees,
  ruleId: z.string().optional(),
  reason: z.string(),
  citation: Citation.optional(),
});
export type AssessedDeduction = z.infer<typeof AssessedDeduction>;

/** Output of engine.claim.assess. */
export const ClaimAssessment = z.object({
  deductions: z.array(AssessedDeduction),
  recoverable: Rupees,
  /** What the engine computes the insurer approved from the letter's deductions and co-pay. */
  approved: Rupees.optional(),
  expectedPayout: Rupees,
  trace: z.array(RuleFiring),
});
export type ClaimAssessment = z.infer<typeof ClaimAssessment>;

export const ClaimCase = z.object({
  id: z.string(),
  householdId: z.string(),
  policyId: z.string().optional(),
  letter: SettlementLetter.optional(),
  assessment: ClaimAssessment.optional(),
  appealActionId: z.string().optional(),
  status: z.enum(['reading', 'assessed', 'appeal_drafted', 'appeal_sent', 'resolved']),
  createdAt: z.string().datetime(),
});
export type ClaimCase = z.infer<typeof ClaimCase>;
