import type { Household, Member } from '@kavach/schemas';
import { handleSettlementLetter } from '../../claims/door';
import { blobs } from '../../lib/blobs';
import type { Media, Outgoing } from './types';

/**
 * Settlement letter forwarded on WhatsApp (W5): runs the same claim pipeline as the app's
 * claim screens and returns the verdict text, plus the verified appeal PDF when one was made.
 */
export async function readForwardedClaimLetter(input: {
  household: Household;
  member: Member;
  files: Media[];
}): Promise<Outgoing[]> {
  const [file] = input.files;
  if (!file) return [];
  const verdict = await handleSettlementLetter(input.household.id, input.member.id, {
    filename: file.filename ?? 'settlement-letter',
    mimeType: file.mimeType,
    bytes: file.data,
  });
  const out: Outgoing[] = [{ kind: 'text', text: verdict.text }];
  if (verdict.pdfPath) {
    out.push({
      kind: 'document',
      data: await blobs.get(verdict.pdfPath),
      filename: (verdict.pdfFilename ?? 'kavach-appeal.pdf').replaceAll('/', '-'),
    });
  }
  return out;
}
