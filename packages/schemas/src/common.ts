import { z } from 'zod';

export const Locale = z.enum(['en', 'hi']);
export type Locale = z.infer<typeof Locale>;

/** Whole rupees. Every amount in Kavach is an integer number of rupees. */
export const Rupees = z.number().int();
export type Rupees = z.infer<typeof Rupees>;

/** Where a fact came from: a page and quote in a document. */
export const Citation = z.object({
  documentId: z.string(),
  page: z.number().int().positive().optional(),
  clauseRef: z.string().optional(),
  quote: z.string(),
});
export type Citation = z.infer<typeof Citation>;

export const RuleStatus = z.enum(['verified', 'to_verify']);

/** One rule that fired while the engine computed something; drives the "Why" panel. */
export const RuleFiring = z.object({
  ruleId: z.string(),
  statement: z.string(),
  inputs: z.record(z.string(), z.unknown()).default({}),
  output: z.record(z.string(), z.unknown()).default({}),
  status: RuleStatus.default('to_verify'),
  sources: z.array(z.object({ title: z.string(), url: z.string().optional() })).default([]),
});
export type RuleFiring = z.infer<typeof RuleFiring>;
