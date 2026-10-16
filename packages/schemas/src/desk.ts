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
  status: z.enum(['active', 'ended']),
  createdAt: z.string().datetime(),
});
export type DeskSession = z.infer<typeof DeskSession>;
