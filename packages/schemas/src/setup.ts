import { z } from 'zod';
import { Locale, Rupees } from './common';
import { AccessEntry, ConsentPurpose } from './consent';
import { Finances, Member, Relation } from './household';

export const CreateHouseholdBody = z.object({
  consents: z.array(ConsentPurpose).min(1),
  name: z.string().max(80).optional(),
});

export const SetConsentsBody = z.object({ consents: z.array(ConsentPurpose) });

// ------------------------------------------------------------------ intake (S04 → S05)

/** One person the IntakeAgent found in the family's sentence. Nothing is guessed silently. */
export const IntakeMember = z.object({
  /** Their name, or a label such as "Mother" when the family didn't say it. */
  name: z.string(),
  /** False when `name` is only a label. */
  named: z.boolean(),
  relation: Relation,
  /** Null when the family didn't say. */
  age: z.number().int().nonnegative().nullable(),
  earning: z.boolean().nullable(),
  conditions: z.array(z.string()),
  language: Locale.nullable(),
  /** Fields the agent inferred rather than heard: shown as "We assumed …". */
  assumed: z.array(z.enum(['earning', 'age', 'relation'])),
});
export type IntakeMember = z.infer<typeof IntakeMember>;

export const IntakeResult = z.object({
  familyName: z.string().nullable(),
  city: z.string().nullable(),
  members: z.array(IntakeMember),
  /** What the agent heard (a voice note transcribed, or the typed sentence), for the family to check. */
  transcript: z.string().nullable().optional(),
});
export type IntakeResult = z.infer<typeof IntakeResult>;

export const IntakeParseBody = z
  .object({
    text: z.string().max(1000).optional(),
    /** Base64 audio from the hold-to-speak button (up to 30 s). */
    audio: z.object({ mimeType: z.string(), data: z.string().max(1_500_000) }).optional(),
    locale: Locale.default('en'),
  })
  .refine((b) => (b.text?.trim().length ?? 0) >= 3 || b.audio, {
    message: 'Send text or audio',
  });

/** S05 "Looks right": the family as confirmed. Members without an id are new. */
export const SetMembersBody = z.object({
  name: z.string().min(1).max(80),
  city: z.string().max(80).optional(),
  members: z
    .array(Member.partial({ id: true }))
    .min(1)
    .max(20),
});

export const SetFinancesBody = Finances;

// ------------------------------------------------------------------ smart questions (S08)

export const SmartQuestionId = z.enum(['spouse_earning', 'other_cover', 'parents_health']);
export type SmartQuestionId = z.infer<typeof SmartQuestionId>;

export const SmartQuestion = z.object({
  id: SmartQuestionId,
  /** Names and employer for the question text. */
  params: z.record(z.string(), z.string()).default({}),
  options: z.array(z.string()),
  /** Engine-computed rupee effect of the answer, when there is one. */
  impact: Rupees.optional(),
});
export type SmartQuestion = z.infer<typeof SmartQuestion>;

export const AnswersBody = z.object({ answers: z.partialRecord(SmartQuestionId, z.string()) });

// ------------------------------------------------------------------ family access (S28)

export const Invite = z.object({
  id: z.string(),
  householdId: z.string(),
  memberId: z.string(),
  language: Locale,
  phone: z.string().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  acceptedBy: z.string().optional(),
});
export type Invite = z.infer<typeof Invite>;

export const CreateInviteBody = z.object({
  memberId: z.string(),
  language: Locale,
  phone: z.string().max(20).optional(),
});
export const CreateInviteResponse = z.object({ invite: Invite, url: z.string() });

/** What the invite link shows before sign-in (S02). */
export const InvitePreview = z.object({
  householdName: z.string(),
  inviterName: z.string(),
  memberName: z.string(),
  language: Locale,
});

/** A member's WhatsApp state (S28): whether Kavach may message them there. */
export const WhatsAppOptIn = z.object({
  memberId: z.string(),
  phone: z.string().optional(),
  state: z.enum(['joined', 'opted_out', 'not_joined', 'no_number']),
});

export const FamilyAccess = z.object({
  access: z.array(AccessEntry),
  whatsapp: z.array(WhatsAppOptIn).default([]),
  invites: z.array(Invite),
  alertContactMemberId: z.string().optional(),
});

// ------------------------------------------------------------------ timeline (S25)

export const TimelineKind = z.enum([
  'setup',
  'consent',
  'document_added',
  'life_change',
  'action',
  'desk_session',
  'claim_case',
  'notification',
  'cover_starts',
  'cover_ends',
]);
export type TimelineKind = z.infer<typeof TimelineKind>;

export const TimelineEntry = z.object({
  id: z.string(),
  kind: TimelineKind,
  /** When it happened, or the date it takes effect for future entries. */
  at: z.string(),
  /** Who caused it. */
  by: z.enum(['you', 'document', 'kavach']),
  /** Free text written by an agent or the family, e.g. a life change summary. */
  text: z.string().optional(),
  /** Names, dates and labels for the entry's sentence. */
  params: z.record(z.string(), z.string()).default({}),
  /** In-app link to the details. */
  href: z.string().optional(),
  /** A dated event still ahead (cover starting or ending): shown above "Today". */
  upcoming: z.boolean().default(false),
});
export type TimelineEntry = z.infer<typeof TimelineEntry>;

export const Timeline = z.object({ today: z.string().date(), entries: z.array(TimelineEntry) });
