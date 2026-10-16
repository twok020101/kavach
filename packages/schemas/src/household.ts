import { z } from 'zod';
import { Citation, Locale, Rupees } from './common';

export const Relation = z.enum(['self', 'spouse', 'child', 'parent', 'parent_in_law', 'other']);

export const Member = z.object({
  id: z.string(),
  name: z.string(),
  relation: Relation,
  age: z.number().int().nonnegative(),
  language: Locale.default('en'),
  /** E.164, e.g. +919800000000. Used to recognise the member on WhatsApp. */
  phone: z.string().optional(),
  whatsappConsentAt: z.string().datetime().optional(),
});
export type Member = z.infer<typeof Member>;

export const PolicyKind = z.enum([
  'group_health',
  'retail_health',
  'super_top_up',
  'term_life',
  'personal_accident',
]);

/** The terms of a policy that the engine needs. Each may carry a citation to the wording. */
export const PolicyTerms = z.object({
  roomRentLimitPerDay: Rupees.optional(),
  icuLimitPerDay: Rupees.optional(),
  copayPercent: z.number().min(0).max(100).default(0),
  /** When set, the co-pay applies only to insured members of at least this age (e.g. 61). */
  copayFromAge: z.number().int().nonnegative().optional(),
  /** Super top-up / deductible: the policy pays only above this amount per year. */
  deductible: Rupees.default(0),
  proportionateDeduction: z.boolean().default(true),
  citations: z.record(z.string(), Citation).default({}),
});
export type PolicyTerms = z.infer<typeof PolicyTerms>;

export const Policy = z.object({
  id: z.string(),
  kind: PolicyKind,
  insurer: z.string(),
  productName: z.string(),
  uin: z.string().optional(),
  source: z.enum(['employer', 'personal']),
  /** For employer cover: the employer whose employment the cover depends on. */
  employer: z.string().optional(),
  holderMemberId: z.string(),
  coveredMemberIds: z.array(z.string()),
  sumInsured: Rupees,
  claimsUsedThisYear: Rupees.default(0),
  startDate: z.string().date(),
  endDate: z.string().date(),
  terms: PolicyTerms,
});
export type Policy = z.infer<typeof Policy>;

export const Finances = z.object({
  takeHomeMonthly: Rupees,
  emiMonthly: Rupees.default(0),
  fixedSpendMonthly: Rupees.default(0),
  emergencyFund: Rupees.default(0),
});
export type Finances = z.infer<typeof Finances>;

export const Household = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  country: z.literal('IN').default('IN'),
  members: z.array(Member),
  policies: z.array(Policy),
  finances: Finances.optional(),
  /** Uids allowed to read and change this household. */
  accessUids: z.array(z.string()).default([]),
  isDemo: z.boolean().default(false),
  /** Demo clock (ISO date). Real households use today. */
  asOf: z.string().date().optional(),
  createdAt: z.string().datetime(),
});
export type Household = z.infer<typeof Household>;
