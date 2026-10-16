import { formatInr } from '@kavach/engine';
import type { ClaimCase, Household, Locale } from '@kavach/schemas';
import { store } from '../store';
import { appealPdf, createClaim, draftClaimAppeal, type LetterFile } from './service';

const COPY = {
  en: {
    head: (c: ClaimCase) =>
      `${c.letter!.patientName}'s claim ${c.letter!.claimNumber}: bill ${formatInr(c.letter!.billAmount)}, paid ${formatInr(c.letter!.approvedAmount)}.`,
    verdict: { valid: 'valid', challengeable: 'challengeable', possibly: 'possibly recoverable' },
    recoverable: (amount: string) => `Up to ${amount} may be recoverable.`,
    attached: 'The appeal letter is attached. Send it to the insurer’s grievance officer.',
    blocked:
      'I drafted an appeal but could not confirm every number in it, so I have not sent it. Open the claim in the Kavach app to check it.',
    nothing: 'Every deduction looks valid, so there is nothing to appeal.',
    failed: 'I could not read this letter. Please send a clearer photo or the PDF.',
  },
  hi: {
    head: (c: ClaimCase) =>
      `${c.letter!.patientName} का क्लेम ${c.letter!.claimNumber}: बिल ${formatInr(c.letter!.billAmount)}, मिला ${formatInr(c.letter!.approvedAmount)}।`,
    verdict: {
      valid: 'सही कटौती',
      challengeable: 'चुनौती दी जा सकती है',
      possibly: 'शायद वापस मिल सकता है',
    },
    recoverable: (amount: string) => `${amount} तक वापस मिल सकते हैं।`,
    attached: 'अपील पत्र साथ में है। इसे बीमा कंपनी के शिकायत अधिकारी को भेजें।',
    blocked:
      'मैंने अपील पत्र बनाया, पर हर रकम की पुष्टि नहीं हो पाई, इसलिए नहीं भेजा। Kavach ऐप में क्लेम खोलकर देखें।',
    nothing: 'हर कटौती सही लगती है, इसलिए अपील की ज़रूरत नहीं है।',
    failed: 'यह पत्र पढ़ा नहीं जा सका। कृपया साफ़ फ़ोटो या PDF भेजें।',
  },
} as const;

const MARK = { valid: '✓', challengeable: '✕', possibly: '◐' } as const;

export type SettlementLetterReply = {
  claimId: string;
  locale: Locale;
  /** The verdict message to send back, in the member's language. */
  text: string;
  /** Blob path of the verified appeal PDF (see lib/blobs), when one was made. */
  pdfPath?: string;
  pdfFilename?: string;
  recoverable: number;
};

/**
 * The WhatsApp door's entry point for a forwarded settlement letter: reads it, assesses it with
 * the engine, drafts and verifies the appeal, and prints the PDF when every check passes.
 * Same pipeline as the app's claim screens (S30–S32).
 */
export async function handleSettlementLetter(
  householdId: string,
  memberId: string | undefined,
  file: LetterFile,
): Promise<SettlementLetterReply> {
  const household = await store.get<Household>('households', householdId);
  if (!household) throw new Error(`Household ${householdId} not found`);
  const locale = household.members.find((m) => m.id === memberId)?.language ?? 'en';
  const t = COPY[locale];

  let claim = await createClaim(household, file);
  if (claim.status === 'failed' || !claim.assessment) {
    return { claimId: claim.id, locale, text: t.failed, recoverable: 0 };
  }
  const { assessment } = claim;
  const lines = [
    t.head(claim),
    ...assessment.deductions.map(
      (d) => `${MARK[d.verdict]} ${d.label} ${formatInr(d.amount)}: ${t.verdict[d.verdict]}`,
    ),
  ];
  if (assessment.recoverable <= 0) {
    return { claimId: claim.id, locale, text: [...lines, t.nothing].join('\n'), recoverable: 0 };
  }
  lines.push(t.recoverable(formatInr(assessment.recoverable)));

  claim = await draftClaimAppeal(household, claim);
  if (!claim.appeal?.verification.ok) {
    lines.push(t.blocked);
    return {
      claimId: claim.id,
      locale,
      text: lines.join('\n'),
      recoverable: assessment.recoverable,
    };
  }
  const pdf = await appealPdf(claim);
  lines.push(t.attached);
  return {
    claimId: claim.id,
    locale,
    text: lines.join('\n'),
    pdfPath: pdf.path,
    pdfFilename: pdf.filename,
    recoverable: assessment.recoverable,
  };
}
