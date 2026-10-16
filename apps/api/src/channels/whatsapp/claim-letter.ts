import type { Household, Locale, Member } from '@kavach/schemas';
import { WA_COPY } from './copy';
import type { Media } from './types';

/**
 * Settlement letter forwarded on WhatsApp (W5). Stub until the claim reader (WP-10,
 * apps/api/src/claims) lands: it should open a claim case, assess it and return the verdict text
 * and appeal PDF. For now it only acknowledges the letter.
 */
export async function readForwardedClaimLetter(input: {
  household: Household;
  member: Member;
  files: Media[];
  locale: Locale;
}): Promise<{ text: string }> {
  return { text: WA_COPY[input.locale].claimSoon };
}
