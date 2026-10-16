import { z } from 'zod';
import { Locale } from './common';
import { DeskAnswer, DeskCard, DeskSessionSummary } from './desk';
import { BillingType, HospitalEstimate } from './hospital';

/**
 * The live desk WebSocket protocol (`/v1/live/{sessionId}`, docs/plan/06-api.md §3).
 * Audio only: PCM16 LE mono, 16 kHz from the browser and 24 kHz back, base64 in JSON.
 */

export const LiveClientMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), language: Locale.optional() }),
  z.object({ type: z.literal('audio'), data: z.string().max(64_000) }),
  /** The mic was muted or the person tapped "done": the end of their turn. */
  z.object({ type: z.literal('audioEnd') }),
  /** A still was uploaded through the captures endpoint; the agent should read it. */
  z.object({ type: z.literal('capture') }),
  z.object({ type: z.literal('text'), text: z.string().min(1).max(2000) }),
  /** The desk's answer to the R-HL-010 question, from a button. */
  z.object({ type: z.literal('billingAnswer'), billingType: BillingType }),
  z.object({ type: z.literal('setLanguage'), language: Locale }),
  z.object({ type: z.literal('ping') }),
  z.object({ type: z.literal('end') }),
]);
export type LiveClientMessage = z.infer<typeof LiveClientMessage>;

export const LiveErrorCode = z.enum([
  'model_unavailable',
  'session_not_found',
  'session_ended',
  'time_limit',
  'bad_message',
  'internal',
]);
export type LiveErrorCode = z.infer<typeof LiveErrorCode>;

export const LiveServerMessage = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), sessionId: z.string(), resumable: z.boolean() }),
  z.object({ type: z.literal('audio'), data: z.string() }),
  z.object({
    type: z.literal('caption'),
    role: z.enum(['user', 'agent']),
    /** The text so far for this turn (replaces the previous partial). */
    text: z.string(),
    final: z.boolean(),
  }),
  /** The person spoke over the agent: drop any queued playback. */
  z.object({ type: z.literal('interrupted') }),
  z.object({ type: z.literal('turnComplete') }),
  z.object({ type: z.literal('step'), label: z.string(), state: z.enum(['start', 'done']) }),
  z.object({ type: z.literal('estimate'), estimate: HospitalEstimate }),
  z.object({ type: z.literal('answer'), answer: DeskAnswer }),
  z.object({ type: z.literal('card'), card: DeskCard }),
  z.object({ type: z.literal('pong') }),
  z.object({
    type: z.literal('error'),
    code: LiveErrorCode,
    /** `text`: the browser should switch to the text-and-photo desk. */
    fallback: z.literal('text').optional(),
  }),
  z.object({ type: z.literal('ended'), summary: DeskSessionSummary.optional() }),
]);
export type LiveServerMessage = z.infer<typeof LiveServerMessage>;
