import { z } from 'zod';
import { RuleFiring, Rupees } from './common';

// ------------------------------------------------------------------ cover map (docs/plan/05 §3)

export const Risk = z.enum(['health', 'life', 'accident']);
export type Risk = z.infer<typeof Risk>;

/**
 * - covered: personal + statutory cover meets the need
 * - contingent: the need is met only with employer cover (gone if the job ends)
 * - partial: 30–90% of the need, or a blocking issue
 * - gap: under 30% of the need
 * - na: the risk does not apply to this member
 */
export const CellStatus = z.enum(['covered', 'contingent', 'partial', 'gap', 'na']);
export type CellStatus = z.infer<typeof CellStatus>;

export const CellIssue = z.enum(['topup_without_base', 'savings_plan_not_term', 'below_minimum']);
export type CellIssue = z.infer<typeof CellIssue>;

/** How much cover a member has for one risk, by layer. */
export const LayerAmounts = z.object({
  statutory: Rupees,
  employer: Rupees,
  personal: Rupees,
});

export const CoverCell = z.object({
  memberId: z.string(),
  risk: Risk,
  status: CellStatus,
  need: Rupees,
  have: LayerAmounts,
  gap: Rupees,
  issues: z.array(CellIssue),
  /** Policies counted in this cell (in force on the map's date). */
  policyIds: z.array(z.string()),
  /** Employer the cell depends on, when employer cover is part of what it has. */
  employer: z.string().optional(),
  /** Last day of that employer cover, if it ends within the policy year. */
  employerCoverEnds: z.string().date().optional(),
  ruleIds: z.array(z.string()),
});
export type CoverCell = z.infer<typeof CoverCell>;

export const CoverMap = z.object({
  asOf: z.string().date(),
  cells: z.array(CoverCell),
  /** R-SC-001, 0–100. Employer cover counts half. */
  score: z.number().int(),
});
export type CoverMap = z.infer<typeof CoverMap>;

// ------------------------------------------------------------------ budget and plan (05 §4–§6)

export const Budget = z.object({
  takeHomeMonthly: Rupees,
  disposableMonthly: Rupees,
  /** R-BG-001: min(20% of disposable, 10% of take-home). */
  totalMonthly: Rupees,
  existingPremiumsMonthly: Rupees,
  forNewMonthly: Rupees,
  thinEmergencyFund: z.boolean(),
});
export type Budget = z.infer<typeof Budget>;

export const RecommendationCategory = z.enum([
  'term_life',
  'family_health',
  'parents_health',
  'personal_accident',
  'device',
]);
export type RecommendationCategory = z.infer<typeof RecommendationCategory>;

export const Recommendation = z.object({
  /** Stable across plans (the category plus who it covers), so diffs can match items. */
  id: z.string(),
  category: RecommendationCategory,
  memberIds: z.array(z.string()),
  cover: Rupees,
  /** Indicative premium from the illustrative catalog. */
  premiumAnnual: Rupees,
  premiumMonthly: Rupees,
  /** Rupees of need this closes, summed over the cells it covers. */
  gapClosed: Rupees,
  urgency: z.number(),
  status: z.enum(['selected', 'deferred']),
  deferReason: z.enum(['budget', 'employer_cover']).optional(),
  /** How to get it: buy new, or move from an employer group policy to an individual one. */
  via: z.enum(['new', 'migration']),
  /** Employer whose group cover makes this less urgent, or that it migrates from. */
  employer: z.string().optional(),
  assetLabel: z.string().optional(),
  ruleIds: z.array(z.string()),
});
export type Recommendation = z.infer<typeof Recommendation>;

export const PlanReview = z.object({
  policyId: z.string(),
  issue: CellIssue,
});

/** A date on which the cover map changes: shown as a pin on the date scrubber. */
export const PlanEvent = z.object({
  date: z.string().date(),
  kind: z.enum(['cover_starts', 'cover_ends']),
  policyId: z.string(),
});
export type PlanEvent = z.infer<typeof PlanEvent>;

export const Plan = z.object({
  id: z.string(),
  householdId: z.string(),
  asOf: z.string().date(),
  coverMap: CoverMap,
  budget: Budget,
  recommendations: z.array(Recommendation),
  /** Sum of selected recommendations' monthly premiums. */
  monthlySpend: Rupees,
  reviews: z.array(PlanReview),
  events: z.array(PlanEvent),
  trace: z.array(RuleFiring),
});
export type Plan = z.infer<typeof Plan>;

export const PlanDiff = z.object({
  fromPlanId: z.string(),
  toPlanId: z.string(),
  /** Selected in the new plan and not in the old one. */
  added: z.array(Recommendation),
  /** Selected in the old plan and no longer selected (deferred or gone). */
  removed: z.array(Recommendation),
  monthlySpend: z.object({ before: Rupees, after: Rupees }),
  budgetForNew: z.object({ before: Rupees, after: Rupees }),
  score: z.object({ before: z.number().int(), after: z.number().int() }),
  cellsChanged: z.array(
    z.object({
      memberId: z.string(),
      risk: Risk,
      before: CellStatus,
      after: CellStatus,
    }),
  ),
});
export type PlanDiff = z.infer<typeof PlanDiff>;

// ------------------------------------------------------------------ life changes (moment 1)

export const GroupHealthOffer = z.object({
  /** Whether the new employer gives health cover: yes, no, or not stated. */
  offered: z.enum(['yes', 'no', 'unknown']),
  sumInsured: Rupees.optional(),
  coveredMemberIds: z.array(z.string()).optional(),
});
export type GroupHealthOffer = z.infer<typeof GroupHealthOffer>;

export const LifeChange = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('employment_ended'),
    memberId: z.string(),
    employer: z.string(),
    lastDay: z.string().date(),
  }),
  z.object({
    type: z.literal('employment_started'),
    memberId: z.string(),
    employer: z.string(),
    startDate: z.string().date(),
    groupHealth: GroupHealthOffer,
  }),
]);
export type LifeChange = z.infer<typeof LifeChange>;

/** What the LifeEventAgent understood from the family's words; confirmed by them before it is applied. */
export const ChangeSet = z.object({
  /** One line in the family's language, e.g. "Rahul moves from Acme Software to Orbit Labs on 1 Dec". */
  summary: z.string(),
  effectiveDate: z.string().date(),
  changes: z.array(LifeChange).min(1),
  /** True when a date or detail was guessed and the family should check it. */
  needsConfirmation: z.boolean(),
  /** Words the agent could not turn into a change. */
  unrecognised: z.array(z.string()),
});
export type ChangeSet = z.infer<typeof ChangeSet>;

/** A recorded life change with the re-plan it caused. */
export const LifeChangeRecord = z.object({
  id: z.string(),
  householdId: z.string(),
  text: z.string().optional(),
  changeSet: ChangeSet,
  diff: PlanDiff,
  /** Plan before the change (as of the household's today) and after it (as of the effective date). */
  before: Plan,
  after: Plan,
  actionIds: z.array(z.string()),
  createdAt: z.string().datetime(),
});
export type LifeChangeRecord = z.infer<typeof LifeChangeRecord>;
