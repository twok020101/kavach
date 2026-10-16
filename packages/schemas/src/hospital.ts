import { z } from 'zod';
import { RuleFiring, Rupees } from './common';

/**
 * How the hospital prices treatment across room categories.
 * - differential: some heads (surgeon, OT, nursing…) cost more in a pricier room
 * - flat: the same price whatever the room
 * - package: one package price per room category
 * - unknown: not readable from the estimate; the agent asks the desk
 */
export const BillingType = z.enum(['differential', 'flat', 'package', 'unknown']);
export type BillingType = z.infer<typeof BillingType>;

export const LineHead = z.enum([
  'room',
  'nursing',
  'surgeon',
  'ot',
  'doctor_visits',
  'icu',
  'implant',
  'pharmacy',
  'consumables',
  'diagnostics',
  'non_payable',
  'other',
]);
export type LineHead = z.infer<typeof LineHead>;

export const RoomCategory = z.object({
  id: z.string(),
  label: z.string(),
  rentPerDay: Rupees,
});
export type RoomCategory = z.infer<typeof RoomCategory>;

export const EstimateLine = z.object({
  head: LineHead,
  label: z.string(),
  /** True when the tariff charges a different amount for this head in each room category. */
  pricedByRoom: z.boolean(),
  /** Amount for each room category, keyed by RoomCategory.id. */
  amounts: z.record(z.string(), Rupees),
  /** Days charged on a per-day head (room, icu) when it differs from the stay; defaults to HospitalEstimate.days. */
  days: z.number().int().positive().optional(),
});
export type EstimateLine = z.infer<typeof EstimateLine>;

/** What the estimate reader extracts from a photo of a hospital estimate. */
export const HospitalEstimate = z.object({
  hospitalName: z.string(),
  patientName: z.string().optional(),
  procedure: z.string(),
  admissionType: z.enum(['planned', 'emergency']),
  days: z.number().int().positive(),
  billingType: BillingType,
  /** The first category is the room the estimate was quoted for. */
  roomCategories: z.array(RoomCategory).min(1),
  lines: z.array(EstimateLine),
  packagePrices: z.record(z.string(), Rupees).optional(),
  /** Set when the numbers don't add up or a field was unreadable; the user must confirm. */
  needsConfirmation: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
});
export type HospitalEstimate = z.infer<typeof HospitalEstimate>;

export const Deduction = z.object({
  ruleId: z.string(),
  label: z.string(),
  amount: Rupees,
});

export const PolicyShare = z.object({
  policyId: z.string(),
  pays: Rupees,
});

/** The engine's result for one room category. */
export const RoomOptionResult = z.object({
  roomCategoryId: z.string(),
  label: z.string(),
  rentPerDay: Rupees,
  bill: Rupees,
  admissible: Rupees,
  deductions: z.array(Deduction),
  copay: Rupees,
  policyPays: Rupees,
  outOfPocket: Rupees,
  policyShares: z.array(PolicyShare),
});
export type RoomOptionResult = z.infer<typeof RoomOptionResult>;

export const BranchResult = z.object({
  billingType: BillingType,
  options: z.array(RoomOptionResult),
  recommendedRoomCategoryId: z.string(),
  /** Out-of-pocket difference between the most expensive option and the recommended one. */
  saving: Rupees,
});
export type BranchResult = z.infer<typeof BranchResult>;

/** Output of engine.hospital.evaluate. */
export const DeskEvaluation = z.object({
  /** Policy to show at the TPA desk first, then the rest, in order. */
  policyOrder: z.array(z.string()),
  primary: BranchResult,
  /** When billing type is unknown: the other branch, so both can be shown. */
  alternate: BranchResult.optional(),
  /** One question the patient's family should ask the hospital desk, if any. */
  questionForDesk: z.string().optional(),
  trace: z.array(RuleFiring),
});
export type DeskEvaluation = z.infer<typeof DeskEvaluation>;
