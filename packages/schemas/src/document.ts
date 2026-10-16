import { z } from 'zod';
import { Citation } from './common';
import { Policy, Relation } from './household';

/** What a household document is. Set by the document reader. */
export const DocKind = z.enum([
  'benefits_summary',
  'policy_schedule',
  'wording',
  'estimate',
  'settlement_letter',
  'other',
]);
export type DocKind = z.infer<typeof DocKind>;

export const DocStatus = z.enum(['uploaded', 'reading', 'read', 'failed']);
export type DocStatus = z.infer<typeof DocStatus>;

/** A person printed on the document as insured, matched to a household member when possible. */
export const InsuredPerson = z.object({
  name: z.string(),
  relation: Relation.optional(),
  age: z.number().int().nonnegative().optional(),
  /** Filled by the API after reading, not by the model. */
  memberId: z.string().optional(),
});
export type InsuredPerson = z.infer<typeof InsuredPerson>;

/**
 * A policy as printed on a document: a Policy without the household ids.
 * Citations in `terms.citations` are keyed by the term they support
 * (sumInsured, roomRentLimitPerDay, icuLimitPerDay, icu, copayPercent, deductible,
 * proportionateDeduction, nonPayables).
 */
export const PolicyDraft = Policy.omit({
  id: true,
  holderMemberId: true,
  coveredMemberIds: true,
  claimsUsedThisYear: true,
  documentIds: true,
});
export type PolicyDraft = z.infer<typeof PolicyDraft>;

/** What the document reader extracts from one uploaded document (fixtures: apps/api/fixtures/doc-*.json). */
export const DocExtraction = z.object({
  kind: DocKind,
  /** The id the model was told; the API rewrites every citation to the stored document id. */
  documentId: z.string(),
  /** Present for policy schedules and benefits summaries. */
  policy: PolicyDraft.optional(),
  insuredPersons: z.array(InsuredPerson).default([]),
  /** Employer cover only: what happens to the cover when the employee leaves. */
  employment: z
    .object({
      coverEndsOn: z.enum(['last_working_day', 'end_of_month', 'policy_end']),
      migrationOption: z.boolean(),
      migrationDeadlineDaysBeforeExit: z.number().int().optional(),
    })
    .optional(),
  /** One-line summary for documents that are not policies (estimates, letters). */
  summary: z.string().optional(),
  /** Other facts worth citing that are not policy terms. */
  citations: z.array(Citation).default([]),
  notes: z.array(z.string()).default([]),
});
export type DocExtraction = z.infer<typeof DocExtraction>;

/** households/{hid}/documents/{docId} */
export const DocumentRecord = z.object({
  id: z.string(),
  householdId: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string(),
  kind: DocKind,
  status: DocStatus,
  /** Drives the progress steps on S07, e.g. { step: 'reading_pages', done: 2, total: 3 }. */
  progress: z
    .object({
      step: z.enum(['queued', 'reading_pages', 'matching_family', 'linking_clauses', 'done']),
      done: z.number().int(),
      total: z.number().int(),
    })
    .optional(),
  pageCount: z.number().int().positive().optional(),
  extraction: DocExtraction.optional(),
  /** Set once the extraction is confirmed into the household. */
  confirmedPolicyId: z.string().optional(),
  isSample: z.boolean().default(false),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type DocumentRecord = z.infer<typeof DocumentRecord>;

export const DocumentList = z.object({ documents: z.array(DocumentRecord) });

export const ConfirmDocumentResponse = z.object({ policyId: z.string(), created: z.boolean() });
export type ConfirmDocumentResponse = z.infer<typeof ConfirmDocumentResponse>;

export const ClauseCategory = z.enum([
  'definition',
  'coverage',
  'limit',
  'copay',
  'deductible',
  'waiting_period',
  'exclusion',
  'claim_procedure',
  'grievance',
  'portability',
  'other',
]);

/** One numbered clause of a policy wording, verbatim. Stored in the `clauses` collection. */
export const Clause = z.object({
  /** `${productKey}__${ref}` */
  id: z.string(),
  /** The product's UIN, or its policy number when no UIN is printed. */
  productKey: z.string(),
  insurer: z.string(),
  productName: z.string(),
  ref: z.string(),
  title: z.string(),
  text: z.string(),
  page: z.number().int().positive(),
  category: ClauseCategory.default('other'),
});
export type Clause = z.infer<typeof Clause>;

/** A clause as stored, with its embedding (never sent to the web). */
export const StoredClause = Clause.extend({
  embedding: z.array(z.number()),
  embeddingModel: z.string(),
});
export type StoredClause = z.infer<typeof StoredClause>;

/** What the wording segmenter returns for one wording (fixtures: apps/api/fixtures/clauses-*.json). */
export const ClauseList = z.object({
  clauses: z.array(Clause.pick({ ref: true, title: true, text: true, page: true, category: true })),
});
export type ClauseList = z.infer<typeof ClauseList>;

export const ClauseSearchRequest = z.object({
  query: z.string().min(2),
  productKey: z.string().optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const ClauseSearchResponse = z.object({
  results: z.array(z.object({ clause: Clause, score: z.number() })),
});
export type ClauseSearchResponse = z.infer<typeof ClauseSearchResponse>;
