import { z } from 'zod';
import { Locale, RuleFiring, Rupees } from './common';
import { BillingType, HospitalEstimate, RoomCategory } from './hospital';

export const DeskCardKind = z.enum([
  'policy_order',
  'room_compare',
  'ask_desk',
  'billing_branch',
  'top_up_note',
  'warning',
]);

/** A card shown on the desk screen and rendered as an image on WhatsApp. */
export const DeskCard = z.object({
  id: z.string(),
  kind: DeskCardKind,
  title: z.string(),
  body: z.string(),
  amounts: z
    .array(z.object({ label: z.string(), amount: Rupees, emphasis: z.boolean().default(false) }))
    .default([]),
  ruleIds: z.array(z.string()).default([]),
  /** True when every number on the card came from the engine trace. */
  verified: z.boolean().default(true),
});
export type DeskCard = z.infer<typeof DeskCard>;

/** Input to the channel-agnostic desk core, from the app, the live session or WhatsApp. */
export const DeskInputs = z.object({
  estimate: HospitalEstimate.optional(),
  utteranceText: z.string().optional(),
  roomOptions: z.array(RoomCategory).optional(),
  billingTypeAnswer: BillingType.optional(),
});
export type DeskInputs = z.infer<typeof DeskInputs>;

export const DeskAnswer = z.object({
  /** Short text for captions and WhatsApp. */
  text: z.string(),
  /** The line to speak aloud, built from engine output. Agents speak this verbatim. */
  say: z.string(),
  cards: z.array(DeskCard),
  questionForDesk: z.string().optional(),
  trace: z.array(RuleFiring),
  /** The language the answer is in (the utterance can switch it). */
  locale: Locale.optional(),
});
export type DeskAnswer = z.infer<typeof DeskAnswer>;

export const DeskSession = z.object({
  id: z.string(),
  householdId: z.string(),
  patientMemberId: z.string(),
  language: Locale,
  hospitalName: z.string().optional(),
  channel: z.enum(['app', 'live', 'whatsapp']),
  estimate: HospitalEstimate.optional(),
  lastAnswer: DeskAnswer.optional(),
  /** The family's answer to "are charges the same in every room?", used until a new estimate arrives. */
  billingTypeAnswer: BillingType.optional(),
  /** Blob paths of the estimate photos read in this session. */
  capturePaths: z.array(z.string()).default([]),
  status: z.enum(['active', 'ended']),
  createdAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
});
export type DeskSession = z.infer<typeof DeskSession>;

// ── Desk API (text-and-photo desk; the live session and WhatsApp reuse the same core) ──

/** The parts of the household the desk needs, shown when a session starts. */
export const DeskContext = z.object({
  patient: z.object({
    id: z.string(),
    name: z.string(),
    age: z.number().int(),
    relation: z.string(),
  }),
  asOf: z.string().date(),
  /** Health policies in force for the patient on asOf; empty means no cover. */
  policies: z.array(
    z.object({
      id: z.string(),
      /** Real policy name, e.g. "Individual Health (migrated from group) · Sample Insurer A". */
      name: z.string(),
      /** What the family calls it, e.g. "parents' policy". */
      nickname: z.string(),
      kind: z.string(),
      sumInsured: Rupees,
      claimsUsedThisYear: Rupees,
      roomRentLimitPerDay: Rupees.optional(),
      copayPercent: z.number(),
      copayFromAge: z.number().int().optional(),
      deductible: Rupees,
    }),
  ),
});
export type DeskContext = z.infer<typeof DeskContext>;

export const CreateDeskSessionBody = z.object({
  patientMemberId: z.string(),
  language: Locale,
  hospitalName: z.string().optional(),
  channel: z.enum(['app', 'live', 'whatsapp']).default('app'),
});
export type CreateDeskSessionBody = z.infer<typeof CreateDeskSessionBody>;

export const CreateDeskSessionResponse = z.object({
  sessionId: z.string(),
  session: DeskSession,
  context: DeskContext,
});
export type CreateDeskSessionResponse = z.infer<typeof CreateDeskSessionResponse>;

export const DeskCaptureResponse = z.object({
  estimate: HospitalEstimate,
  answer: DeskAnswer,
});
export type DeskCaptureResponse = z.infer<typeof DeskCaptureResponse>;

/** A text turn. `billingTypeAnswer` is the family's answer to the desk question; `estimate` replaces a misread one. */
export const DeskTurnBody = z.object({
  text: z.string().max(2000).optional(),
  language: Locale.optional(),
  billingTypeAnswer: BillingType.optional(),
  estimate: HospitalEstimate.optional(),
});
export type DeskTurnBody = z.infer<typeof DeskTurnBody>;

export const DeskEvaluateBody = z.object({ roomOptions: z.array(RoomCategory).optional() });

export const DeskSessionSummary = z.object({
  session: DeskSession,
  /** The same summary in both languages, so the family can share either. */
  summary: z.record(Locale, z.string()),
});
export type DeskSessionSummary = z.infer<typeof DeskSessionSummary>;
