import { z } from 'zod';

// ------------------------------------------------------------------ consent (S03, DPDP)

/** One purpose the family agrees to separately (S03). */
export const ConsentPurpose = z.enum(['planning', 'documents', 'health', 'whatsapp']);
export type ConsentPurpose = z.infer<typeof ConsentPurpose>;

export const CONSENT_VERSION = '2026-10-v1';

export const ConsentRecord = z.object({
  purpose: ConsentPurpose,
  version: z.string(),
  grantedAt: z.string().datetime(),
  withdrawnAt: z.string().datetime().optional(),
});
export type ConsentRecord = z.infer<typeof ConsentRecord>;

// ------------------------------------------------------------------ logins (S28)

export const AccessEntry = z.object({
  uid: z.string(),
  role: z.enum(['owner', 'member']),
  /** The person this login is (Kamala's login → mem_kamala). */
  memberId: z.string().optional(),
  addedAt: z.string().datetime(),
});
export type AccessEntry = z.infer<typeof AccessEntry>;
