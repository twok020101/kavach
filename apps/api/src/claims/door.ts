import { formatMoney } from '@kavach/engine';
import type { ClaimCase, Household, Locale } from '@kavach/schemas';
import { store } from '../store';
import { appealPdf, createClaim, draftClaimAppeal, type LetterFile } from './service';

type Money = (n: number) => string;

/** What the WhatsApp door says about a settlement letter, in the member's language. */
const COPY: Record<
  Locale,
  {
    head: (c: ClaimCase, money: Money) => string;
    verdict: { valid: string; challengeable: string; possibly: string };
    recoverable: (amount: string) => string;
    attached: string;
    blocked: string;
    nothing: string;
    failed: string;
  }
> = {
  en: {
    head: (c, money) =>
      `${c.letter!.patientName}'s claim ${c.letter!.claimNumber}: bill ${money(c.letter!.billAmount)}, paid ${money(c.letter!.approvedAmount)}.`,
    verdict: { valid: 'valid', challengeable: 'challengeable', possibly: 'possibly recoverable' },
    recoverable: (amount) => `Up to ${amount} may be recoverable.`,
    attached: 'The appeal letter is attached. Send it to the insurer’s grievance officer.',
    blocked:
      'I drafted an appeal but could not confirm every number in it, so I have not sent it. Open the claim in the Kavach app to check it.',
    nothing: 'Every deduction looks valid, so there is nothing to appeal.',
    failed: 'I could not read this letter. Please send a clearer photo or the PDF.',
  },
  hi: {
    head: (c, money) =>
      `${c.letter!.patientName} का क्लेम ${c.letter!.claimNumber}: बिल ${money(c.letter!.billAmount)}, मिला ${money(c.letter!.approvedAmount)}।`,
    verdict: {
      valid: 'सही कटौती',
      challengeable: 'चुनौती दी जा सकती है',
      possibly: 'शायद वापस मिल सकता है',
    },
    recoverable: (amount) => `${amount} तक वापस मिल सकते हैं।`,
    attached: 'अपील पत्र साथ में है। इसे बीमा कंपनी के शिकायत अधिकारी को भेजें।',
    blocked:
      'मैंने अपील पत्र बनाया, पर हर रकम की पुष्टि नहीं हो पाई, इसलिए नहीं भेजा। Kavach ऐप में क्लेम खोलकर देखें।',
    nothing: 'हर कटौती सही लगती है, इसलिए अपील की ज़रूरत नहीं है।',
    failed: 'यह पत्र पढ़ा नहीं जा सका। कृपया साफ़ फ़ोटो या PDF भेजें।',
  },
  ta: {
    head: (c, money) =>
      `${c.letter!.patientName}-இன் கிளைம் ${c.letter!.claimNumber}: பில் ${money(c.letter!.billAmount)}, செலுத்தப்பட்டது ${money(c.letter!.approvedAmount)}.`,
    verdict: {
      valid: 'சரியான கழிவு',
      challengeable: 'எதிர்க்கலாம்',
      possibly: 'திரும்பக் கிடைக்கக்கூடும்',
    },
    recoverable: (amount) => `${amount} வரை திரும்பக் கிடைக்கலாம்.`,
    attached:
      'அப்பீல் கடிதம் இணைக்கப்பட்டுள்ளது. இதை இன்ஷூரன்ஸ் நிறுவனத்தின் குறைதீர் அதிகாரிக்கு அனுப்புங்கள்.',
    blocked:
      'அப்பீல் கடிதம் தயாரித்தேன், ஆனால் அதில் உள்ள ஒவ்வொரு தொகையையும் உறுதிப்படுத்த முடியவில்லை, எனவே அனுப்பவில்லை. Kavach ஆப்பில் கிளைமைத் திறந்து சரிபாருங்கள்.',
    nothing: 'ஒவ்வொரு கழிவும் சரியாகத் தெரிகிறது, எனவே அப்பீல் செய்ய ஒன்றுமில்லை.',
    failed: 'இந்தக் கடிதத்தைப் படிக்க முடியவில்லை. தெளிவான புகைப்படம் அல்லது PDF அனுப்புங்கள்.',
  },
  zh: {
    head: (c, money) =>
      `${c.letter!.patientName}的索赔 ${c.letter!.claimNumber}：账单${money(c.letter!.billAmount)}，已赔付${money(c.letter!.approvedAmount)}。`,
    verdict: { valid: '扣减合理', challengeable: '可以申诉', possibly: '可能可追回' },
    recoverable: (amount) => `最多可追回${amount}。`,
    attached: '申诉信已附上。请把它发给保险公司的投诉专员。',
    blocked:
      '我起草了申诉信，但无法确认其中的每个数字，所以没有发送。请在 Kavach 应用中打开索赔进行核对。',
    nothing: '每项扣减看起来都合理，所以没有需要申诉的地方。',
    failed: '我无法读取这封信。请发送更清晰的照片或 PDF。',
  },
  ms: {
    head: (c, money) =>
      `Tuntutan ${c.letter!.patientName} ${c.letter!.claimNumber}: bil ${money(c.letter!.billAmount)}, dibayar ${money(c.letter!.approvedAmount)}.`,
    verdict: {
      valid: 'sah',
      challengeable: 'boleh dicabar',
      possibly: 'mungkin boleh dituntut semula',
    },
    recoverable: (amount) => `Sehingga ${amount} mungkin boleh dituntut semula.`,
    attached: 'Surat rayuan dilampirkan. Hantar kepada pegawai aduan syarikat insurans.',
    blocked:
      'Saya telah mendraf rayuan tetapi tidak dapat mengesahkan setiap angka di dalamnya, jadi saya belum menghantarnya. Buka tuntutan dalam aplikasi Kavach untuk menyemaknya.',
    nothing: 'Setiap potongan kelihatan sah, jadi tiada apa yang perlu dirayu.',
    failed: 'Saya tidak dapat membaca surat ini. Sila hantar gambar yang lebih jelas atau PDF.',
  },
};

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
  const money: Money = (n) => formatMoney(n, household.country);

  let claim = await createClaim(household, file);
  if (claim.status === 'failed' || !claim.assessment) {
    return { claimId: claim.id, locale, text: t.failed, recoverable: 0 };
  }
  const { assessment } = claim;
  const lines = [
    t.head(claim, money),
    ...assessment.deductions.map(
      (d) => `${MARK[d.verdict]} ${d.label} ${money(d.amount)}: ${t.verdict[d.verdict]}`,
    ),
  ];
  if (assessment.recoverable <= 0) {
    return { claimId: claim.id, locale, text: [...lines, t.nothing].join('\n'), recoverable: 0 };
  }
  lines.push(t.recoverable(money(assessment.recoverable)));

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
