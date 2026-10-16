import { z } from 'zod';
import { Citation, RuleFiring, Rupees } from './common';

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
    }),
  ),
  copayApplied: Rupees.default(0),
  letterDate: z.string().date().optional(),
});
export type SettlementLetter = z.infer<typeof SettlementLetter>;

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
