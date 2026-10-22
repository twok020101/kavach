import { z } from 'zod';
import { Citation, Country, Locale, Rupees } from './common';
import { AccessEntry, ConsentRecord } from './consent';

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
  /** Known health conditions, e.g. `diabetes_t2`. */
  conditions: z.array(z.string()).default([]),
  earning: z.boolean().optional(),
});
export type Member = z.infer<typeof Member>;

export const PolicyKind = z.enum([
  'group_health',
  'retail_health',
  'super_top_up',
  'term_life',
  'personal_accident',
  'endowment',
  'motor',
  // Singapore (country 'SG'): the national scheme and a private plan built on it.
  'medishield_life',
  'integrated_shield',
]);

/** Singapore ward classes, lowest to highest: subsidised C and B2, then B1, A and private hospitals. */
export const WardClass = z.enum(['C', 'B2', 'B1', 'A', 'private']);
export type WardClass = z.infer<typeof WardClass>;

/**
 * Singapore terms (R-SG-*). MediShield Life carries the national figures; an Integrated Shield
 * Plan carries its own entitlement, pro-ration, deductible, co-insurance and rider.
 */
export const SgTerms = z.object({
  /** The highest ward class paid as charged (MediShield Life: B2). */
  wardEntitlement: WardClass,
  /** Share of the bill counted as claimable in each ward class above the entitlement. */
  prorationByWard: z.partialRecord(WardClass, z.number().min(0).max(1)).default({}),
  /** MediShield Life pro-rates surgical charges (surgeon, OT) by a separate, lower factor. */
  surgicalProrationByWard: z.partialRecord(WardClass, z.number().min(0).max(1)).optional(),
  /** MediShield Life per-day limits; absent on a plan that pays as charged. */
  dailyWardLimit: Rupees.optional(),
  icuDailyLimit: Rupees.optional(),
  firstDaysExtra: z.object({ days: z.number().int().positive(), perDay: Rupees }).optional(),
  /** Deductible per policy year by ward class, for ages 80 and below and from 81. */
  deductibleByWard: z.partialRecord(WardClass, Rupees).default({}),
  deductibleByWardFrom81: z.partialRecord(WardClass, Rupees).optional(),
  /**
   * Co-insurance tiers, measured on the claimable amount of the policy year including the
   * deductible (MediShield Life: 10% to $5,000, 5% to $10,000, 3% beyond); the last tier has no `upTo`.
   */
  coinsurance: z
    .array(z.object({ upTo: Rupees.optional(), percent: z.number().min(0).max(100) }))
    .default([{ percent: 10 }]),
  policyYearLimit: Rupees.optional(),
  /** A rider: pays the deductible and the co-insurance above the insured's own share. */
  rider: z
    .object({
      copayPercent: z.number().min(0).max(100).default(5),
      annualCap: Rupees.optional(),
      /** The cap applies only with a panel specialist and pre-authorisation (MOH). */
      capNeedsPanel: z.boolean().default(true),
      coversDeductible: z.boolean().default(true),
    })
    .optional(),
});
export type SgTerms = z.infer<typeof SgTerms>;

/**
 * Maternity benefit (MX-1). Group policies usually cap delivery expenses at a defined limit;
 * retail plans add a waiting period. Newborn expenses in the first days count inside the limit.
 */
export const MaternityTerms = z.object({
  /** Limit per delivery for a normal delivery. */
  limitNormal: Rupees,
  /** Limit per delivery for a caesarean; defaults to the normal-delivery limit. */
  limitCsection: Rupees.optional(),
  /** Days from birth during which the newborn's expenses are covered inside the maternity limit. */
  newbornDays: z.number().int().nonnegative().default(90),
  /** Months of continuous cover before maternity is payable (0 for most employer group policies). */
  waitingMonths: z.number().int().nonnegative().default(0),
});
export type MaternityTerms = z.infer<typeof MaternityTerms>;

/** The terms of a policy that the engine needs. Each may carry a citation to the wording. */
export const PolicyTerms = z.object({
  roomRentLimitPerDay: Rupees.optional(),
  icuLimitPerDay: Rupees.optional(),
  copayPercent: z.number().min(0).max(100).default(0),
  /** When set, the co-pay applies only to members of this age or older. */
  copayFromAge: z.number().int().optional(),
  /** Super top-up / deductible: the policy pays only above this amount per year. */
  deductible: Rupees.default(0),
  proportionateDeduction: z.boolean().default(true),
  /** Maternity benefit; absent means the policy pays nothing for a delivery. */
  maternity: MaternityTerms.optional(),
  /** Singapore terms; MediShield Life policies may leave it out and take the national figures. */
  sg: SgTerms.optional(),
  /** Read from full wordings (evals); schedules usually don't print them. */
  waitingPeriods: z
    .object({
      initialDays: z.number().int().optional(),
      pedMonths: z.number().int().optional(),
      specificMonths: z.number().int().optional(),
    })
    .optional(),
  citations: z.record(z.string(), Citation).default({}),
});
export type PolicyTerms = z.infer<typeof PolicyTerms>;

export const Policy = z.object({
  id: z.string(),
  kind: PolicyKind,
  insurer: z.string(),
  productName: z.string(),
  uin: z.string().optional(),
  /** As printed on the schedule or benefits summary. */
  policyNumber: z.string().optional(),
  source: z.enum(['employer', 'personal']),
  /** For employer cover: the employer whose employment the cover depends on. */
  employer: z.string().optional(),
  holderMemberId: z.string(),
  coveredMemberIds: z.array(z.string()),
  sumInsured: Rupees,
  claimsUsedThisYear: Rupees.default(0),
  premiumAnnual: Rupees.optional(),
  /** Continuous cover since this date (e.g. carried over on migration); waiting periods count from here. */
  continuousCoverSince: z.string().date().optional(),
  startDate: z.string().date(),
  endDate: z.string().date(),
  terms: PolicyTerms,
  /** Household documents this policy was read from (S15 "Open full document"). */
  documentIds: z.array(z.string()).optional(),
});
export type Policy = z.infer<typeof Policy>;

export const Finances = z.object({
  takeHomeMonthly: Rupees,
  emiMonthly: Rupees.default(0),
  fixedSpendMonthly: Rupees.default(0),
  emergencyFund: Rupees.default(0),
  /** Gross annual income of the earning members, for the life-cover need (R-LF-001). */
  annualIncome: Rupees.optional(),
  /** Loans still to repay (home, car…), for the life-cover need. */
  loansOutstanding: Rupees.default(0),
});
export type Finances = z.infer<typeof Finances>;

/** Things the family owns that may need cover (R-DV-001). */
export const Asset = z.object({
  id: z.string(),
  kind: z.enum(['device', 'vehicle']),
  label: z.string(),
  value: Rupees,
  purchasedOn: z.string().date().optional(),
});
export type Asset = z.infer<typeof Asset>;

export const Household = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  country: Country.default('IN'),
  members: z.array(Member),
  policies: z.array(Policy),
  assets: z.array(Asset).default([]),
  finances: Finances.optional(),
  /** Uids allowed to read and change this household. */
  accessUids: z.array(z.string()).default([]),
  /** Who each login is and what it may do (S28). Missing on older households: everyone is an owner. */
  access: z.array(AccessEntry).optional(),
  /** DPDP consent per purpose (S03, S27). */
  consents: z.array(ConsentRecord).optional(),
  /** Answers to the smart questions (S08). */
  answers: z.record(z.string(), z.string()).optional(),
  /** Who is told when someone in the family is at the hospital (S28), e.g. Rahul for Kamala. */
  alertContactMemberId: z.string().optional(),
  isDemo: z.boolean().default(false),
  /** Demo clock (ISO date). Real households use today. */
  asOf: z.string().date().optional(),
  createdAt: z.string().datetime(),
});
export type Household = z.infer<typeof Household>;
