import { z } from 'zod';
import { Locale } from './common';
import { DeskCard } from './desk';

export const WhatsAppProvider = z.enum(['meta', 'twilio']);
export type WhatsAppProvider = z.infer<typeof WhatsAppProvider>;

/** `whatsappSenders/{e164}`: one WhatsApp number, the member it belongs to and its window. */
export const WhatsAppSender = z.object({
  e164: z.string(),
  provider: WhatsAppProvider,
  householdId: z.string().optional(),
  memberId: z.string().optional(),
  consent: z
    .object({
      grantedAt: z.string().datetime().optional(),
      withdrawnAt: z.string().datetime().optional(),
      version: z.string(),
    })
    .optional(),
  /** Drives the 24-hour free-form window. */
  lastInboundAt: z.string().datetime().optional(),
  /** "STOP" turns off every message except the reply confirming it. */
  optedOut: z.boolean().default(false),
  rateWindow: z.object({ startedAt: z.string().datetime(), count: z.number().int() }).optional(),
  /** The open WhatsApp desk session for this number. */
  deskSessionId: z.string().optional(),
  /** A dated reminder offered this letter (action id); "YES" sends its PDF. */
  pendingLetter: z.object({ householdId: z.string(), actionId: z.string() }).optional(),
  /** Set by the dev simulator: messages to this number are recorded, never sent. */
  simulated: z.boolean().default(false),
});
export type WhatsAppSender = z.infer<typeof WhatsAppSender>;

/** What other features ask the outbound sender to deliver (Meta templates of the same names). */
export const NotificationKind = z.enum(['household_alert', 'dated_reminder']);
export type NotificationKind = z.infer<typeof NotificationKind>;

/** How a notification reached the member. Free-form only inside their 24-hour window. */
export const NotificationChannel = z.enum(['whatsapp_template', 'whatsapp_text', 'in_app']);

/** `households/{hid}/notifications/{id}`: every notification, also shown in the app. */
export const Notification = z.object({
  id: z.string(),
  memberId: z.string(),
  kind: NotificationKind,
  text: z.string(),
  link: z.string().optional(),
  channel: NotificationChannel,
  /** Why it went this way, e.g. "outside 24-hour window". */
  reason: z.string(),
  refId: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type Notification = z.infer<typeof Notification>;

/** `cardShares/{token}`: a desk answer anyone with the link can open (card page and PNG). */
export const CardShare = z.object({
  token: z.string(),
  locale: Locale,
  patientName: z.string(),
  hospitalName: z.string().optional(),
  text: z.string(),
  cards: z.array(DeskCard),
  isDemo: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type CardShare = z.infer<typeof CardShare>;

/** A message Kavach sent (or, with no provider keys, recorded instead of sending). */
export const WhatsAppOutboxMessage = z.object({
  id: z.string(),
  provider: WhatsAppProvider,
  to: z.string(),
  kind: z.enum(['text', 'image', 'audio', 'document', 'template']),
  text: z.string().optional(),
  mediaUrl: z.string().optional(),
  template: z
    .object({ name: NotificationKind, language: Locale, params: z.array(z.string()) })
    .optional(),
  /** False when no provider keys are set and the message was only recorded. */
  delivered: z.boolean(),
  at: z.string().datetime(),
});
export type WhatsAppOutboxMessage = z.infer<typeof WhatsAppOutboxMessage>;
