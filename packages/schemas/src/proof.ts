import { z } from 'zod';
import { RuleStatus } from './common';

// ── Policy-reading evals (WP-11, docs/plan/03-gemini-and-agents.md §9) ──

/** One public policy wording in data/wordings/manifest.yaml. PDFs are fetched, never committed. */
export const WordingEntry = z.object({
  uin: z.string(),
  insurer: z.string(),
  product: z.string(),
  segment: z.enum(['individual', 'floater', 'senior', 'super_top_up', 'group', 'standard']),
  /** Where the PDF is published: IRDAI's product filings or the insurer's own site. */
  source: z.enum(['irdai', 'insurer']),
  url: z.string().url(),
  /** Filled by `pnpm wordings:fetch` after the first download, to notice a changed file. */
  sha256: z.string().nullable().default(null),
  note: z.string().optional(),
});
export type WordingEntry = z.infer<typeof WordingEntry>;

export const WordingManifest = z.object({ wordings: z.array(WordingEntry) });

/** The terms the engine needs, scored per wording. */
export const EvalField = z.enum([
  'roomRentLimitPerDay',
  'icuLimitPerDay',
  'copayPercent',
  'copayFromAge',
  'proportionateDeduction',
  'deductible',
  'initialWaitingDays',
  'pedWaitingMonths',
  'specificWaitingMonths',
  'nonPayables',
]);
export type EvalField = z.infer<typeof EvalField>;

/**
 * A labelled or extracted value. `null` = not labelled yet; `'none'` = the wording has no such
 * limit or condition; `'schedule'` = set in the policy schedule, not the wording (not scored).
 */
export const TermValue = z.union([z.number(), z.boolean(), z.enum(['none', 'schedule']), z.null()]);
export type TermValue = z.infer<typeof TermValue>;

export const LabelEntry = z.object({
  value: TermValue,
  page: z.number().int().positive().nullable(),
  clauseRef: z.string().nullable(),
  quote: z.string().nullable(),
  /** Unverified pointer for the human checker (e.g. from a public summary). Never scored. */
  hint: z.string().optional(),
});

/** data/wordings/labels/<UIN>.json: agent pre-filled, then checked by a person. */
export const WordingLabel = z.object({
  uin: z.string(),
  /** Name of the person who checked every field against the PDF; null until then. */
  checkedBy: z.string().nullable(),
  checkedAt: z.string().nullable(),
  /** Whether the pre-filler read the PDF itself. */
  prefilledFromPdf: z.boolean(),
  /** Limits written as a % of sum insured are labelled in rupees at this sum insured. */
  referenceSumInsured: z.number().int(),
  note: z.string().optional(),
  fields: z.record(EvalField, LabelEntry),
});
export type WordingLabel = z.infer<typeof WordingLabel>;

export const FieldScore = z.object({
  field: EvalField,
  /** Wordings where this field has a label and the wording was read. */
  labelled: z.number().int(),
  correct: z.number().int(),
  accuracy: z.number().nullable(),
});
export type FieldScore = z.infer<typeof FieldScore>;

export const WordingResult = z.object({
  uin: z.string(),
  insurer: z.string(),
  product: z.string(),
  segment: WordingEntry.shape.segment,
  status: z.enum(['read', 'missing_pdf', 'failed']),
  humanChecked: z.boolean(),
  fields: z.array(
    z.object({
      field: EvalField,
      label: TermValue,
      extracted: TermValue,
      /** null when the field is not scored (no label, or set in the schedule). */
      correct: z.boolean().nullable(),
    }),
  ),
  error: z.string().optional(),
});
export type WordingResult = z.infer<typeof WordingResult>;

/** evals/results/latest.json */
export const EvalResults = z.object({
  runAt: z.string().datetime(),
  model: z.string(),
  /** 'fixtures' = FAKE_LLM=1 run: proves the pipeline, not the model. */
  mode: z.enum(['fixtures', 'live']),
  wordings: z.number().int(),
  wordingsRead: z.number().int(),
  labelsChecked: z.number().int(),
  overall: FieldScore.omit({ field: true }),
  perField: z.array(FieldScore),
  results: z.array(WordingResult),
});
export type EvalResults = z.infer<typeof EvalResults>;

/** GET /v1/public/proof */
export const ProofResponse = z.object({
  results: EvalResults,
  rules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: RuleStatus,
      sources: z.array(z.object({ title: z.string(), url: z.string().optional() })),
    }),
  ),
});
export type ProofResponse = z.infer<typeof ProofResponse>;
