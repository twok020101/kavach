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
      /** Policy clause the insurer printed against this deduction, e.g. "3.2". */
      clauseRef: z.string().optional(),
    }),
  ),
  copayApplied: Rupees.default(0),
  letterDate: z.string().date().optional(),
  diagnosis: z.string().optional(),
  admissionDate: z.string().date().optional(),
  dischargeDate: z.string().date().optional(),
  /** The room the patient stayed in, as printed. */
  roomCategory: z.string().optional(),
  roomRentPerDay: Rupees.optional(),
  /** The room-rent eligibility the insurer printed. */
  roomEligibilityPerDay: Rupees.optional(),
  /** True when the letter shows an ICU stay. */
  icuStay: z.boolean().optional(),
  grievanceEmail: z.string().optional(),
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

/** What the appeal drafter (Pro) writes. Amounts and quotes are checked by the verifier. */
export const AppealDraft = z.object({
  subject: z.string(),
  /** Two or three sentences: what was claimed, what was paid, what is being asked. */
  summary: z.string(),
  items: z.array(
    z.object({
      /** The deduction's label as on the assessment. */
      label: z.string(),
      paragraph: z.string(),
      /** Library clause id the paragraph relies on, and a verbatim quote from it. */
      clauseId: z.string().optional(),
      quote: z.string().optional(),
      ruleIds: z.array(z.string()).default([]),
    }),
  ),
  /** The closing request, including the total amount asked for. */
  request: z.string(),
  enclosures: z.array(z.string()).default([]),
});
export type AppealDraft = z.infer<typeof AppealDraft>;

/** One deterministic check the verifier ran on the letter text. */
export const AppealCheck = z.object({
  kind: z.enum(['quote', 'amount', 'rule', 'clause', 'total']),
  ok: z.boolean(),
  /** What was checked, as it appears in the letter. */
  subject: z.string(),
  detail: z.string(),
});
export type AppealCheck = z.infer<typeof AppealCheck>;

export const AppealVerification = z.object({
  ok: z.boolean(),
  checks: z.array(AppealCheck),
  checkedAt: z.string().datetime(),
});
export type AppealVerification = z.infer<typeof AppealVerification>;

/** The appeal letter for a claim: the draft, the full text the family approves, and its checks. */
export const ClaimAppeal = z.object({
  draft: AppealDraft,
  /** The full letter. The family may edit it; every edit is verified again. */
  text: z.string(),
  verification: AppealVerification,
  edited: z.boolean().default(false),
  updatedAt: z.string().datetime(),
});
export type ClaimAppeal = z.infer<typeof ClaimAppeal>;

export const ClaimCase = z.object({
  id: z.string(),
  householdId: z.string(),
  policyId: z.string().optional(),
  /** The patient, matched from the letter. */
  memberId: z.string().optional(),
  letter: SettlementLetter.optional(),
  /** The bill facts the engine used (from the letter, or corrected by the family). */
  bill: ClaimBill.optional(),
  assessment: ClaimAssessment.optional(),
  appeal: ClaimAppeal.optional(),
  appealActionId: z.string().optional(),
  /** Where the uploaded letter is stored, and its type. */
  letterPath: z.string().optional(),
  letterMimeType: z.string().optional(),
  isSample: z.boolean().default(false),
  /** Clause-library product the claim's clauses come from. */
  productKey: z.string().optional(),
  status: z.enum(['reading', 'assessed', 'appeal_drafted', 'appeal_sent', 'resolved', 'failed']),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type ClaimCase = z.infer<typeof ClaimCase>;

export const ClaimList = z.object({ claims: z.array(ClaimCase) });

/** Corrections the family can make before the engine assesses again (S31 "We assumed … · change"). */
export const AssessClaimRequest = z.object({
  roomRentPerDay: Rupees.positive().optional(),
  billingType: BillingType.optional(),
  icuStay: z.boolean().optional(),
});

export const UpdateAppealRequest = z.object({ text: z.string().min(1).max(20_000) });
