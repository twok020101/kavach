import type { BranchResult, DeskEvaluation, Locale, RoomOptionResult } from '@kavach/schemas';
import { type Country, formatInr, formatMoney } from './money';

export { formatInr };

// prettier-ignore
const UNDER_100 = [
  'shunya', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chhah', 'saat', 'aath', 'nau',
  'das', 'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnees',
  'bees', 'ikkees', 'baaees', 'teyees', 'chaubees', 'pachchees', 'chhabbees', 'sattaees', 'atthaees', 'untees',
  'tees', 'ikattees', 'battees', 'taintees', 'chauntees', 'paintees', 'chhattees', 'saintees', 'adtees', 'untaalees',
  'chaalees', 'iktaalees', 'bayaalees', 'taintaalees', 'chavaalees', 'paintaalees', 'chhiyaalees', 'saintaalees', 'adtaalees', 'unchaas',
  'pachaas', 'ikyaavan', 'baavan', 'tirpan', 'chauvan', 'pachpan', 'chhappan', 'sattaavan', 'atthaavan', 'unsath',
  'saath', 'iksath', 'baasath', 'tirsath', 'chausath', 'painsath', 'chhiyaasath', 'sadsath', 'adsath', 'unhattar',
  'sattar', 'ikhattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhihattar', 'sathattar', 'athhattar', 'unaasi',
  'assi', 'ikyaasi', 'bayaasi', 'tiraasi', 'chauraasi', 'pachaasi', 'chhiyaasi', 'sattaasi', 'atthaasi', 'navaasi',
  'nabbe', 'ikyaanave', 'baanave', 'tiraanave', 'chauraanave', 'pachaanave', 'chhiyaanave', 'sattaanave', 'atthaanave', 'ninyaanave',
];

const SCALES: [number, string][] = [
  [1_00_00_000, 'crore'],
  [1_00_000, 'lakh'],
  [1_000, 'hazaar'],
  [100, 'sau'],
];

/** Whole rupees as Hindi words in Latin script, for speech: 150800 → "ek lakh pachaas hazaar aath sau". */
export function hindiWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return UNDER_100[0]!;
  const parts: string[] = [];
  for (const [size, name] of SCALES) {
    const count = Math.floor(n / size);
    if (count > 0) parts.push(`${hindiWords(count)} ${name}`);
    n %= size;
  }
  if (n > 0) parts.push(UNDER_100[n]!);
  return parts.join(' ');
}

export type DeskSayOptions = {
  /** Display names for policies, keyed by policy id (e.g. "parents wali policy"). */
  policyNames?: Record<string, string>;
  /** The household's market: decides the currency the line speaks. */
  country?: Country;
};

/**
 * The line the desk agent speaks, built only from engine numbers so the agent never composes one.
 * Hindi rupee amounts are spoken as words in Latin script; the other languages, and every
 * Singapore-dollar amount, are read from digits, which the native-audio voices handle.
 */
export function buildDeskSay(
  evaluation: DeskEvaluation,
  locale: Locale,
  options: DeskSayOptions = {},
): string {
  const country = options.country ?? 'IN';
  const money: Money = (n) => formatMoney(n, country);
  const t = PHRASES[locale](money, country);
  const { primary, alternate } = evaluation;
  const first = evaluation.policyOrder[0];
  const parts: string[] = [];

  if (first) parts.push(t.policyFirst(options.policyNames?.[first] ?? first));

  const rec = primary.options.find((o) => o.roomCategoryId === primary.recommendedRoomCategoryId)!;
  const worst = mostExpensive(primary);
  if (primary.saving > 0 && worst.roomCategoryId !== rec.roomCategoryId) {
    const cut = worst.deductions.some((d) => d.ruleId === 'R-HL-001');
    parts.push(t.compare(worst, rec, cut, primary.saving));
  } else {
    parts.push(t.youPay(rec.outOfPocket));
  }

  const cap = evaluation.trace.find(
    (f) =>
      f.ruleId === 'R-MT-001' &&
      f.inputs.roomCategoryId === rec.roomCategoryId &&
      f.output.capped === true &&
      typeof f.inputs.limit === 'number' &&
      f.inputs.limit > 0,
  );
  if (cap) parts.push(t.capped(Number(cap.inputs.limit)));

  // No maternity benefit at all (R-MT-001 with limit 0) and nothing paid: say why, or the family
  // hears the whole bill as theirs with no reason (issue #25).
  const noBenefit =
    rec.policyPays === 0
      ? evaluation.trace.find(
          (f) =>
            f.ruleId === 'R-MT-001' &&
            f.inputs.roomCategoryId === rec.roomCategoryId &&
            f.inputs.limit === 0,
        )
      : undefined;
  if (noBenefit) {
    const id = String(noBenefit.inputs.policyId);
    parts.push(t.noMaternity(options.policyNames?.[id] ?? id));
  }
  // The maternity waiting period is not over (R-MT-002): say until when.
  const waiting =
    rec.policyPays === 0
      ? evaluation.trace.find(
          (f) => f.ruleId === 'R-MT-002' && f.inputs.roomCategoryId === rec.roomCategoryId,
        )
      : undefined;
  if (waiting) {
    const id = String(waiting.inputs.policyId);
    parts.push(
      t.waiting(
        options.policyNames?.[id] ?? id,
        longDate(String(waiting.inputs.servedOn), locale, country),
      ),
    );
  }

  if (alternate) parts.push(t.ifFlat(alternate.saving));
  if (primary.billingType === 'package' && evaluation.questionForDesk) parts.push(t.askPackage);

  const topUp = evaluation.trace.find(
    (f) =>
      f.ruleId === 'R-HL-009' &&
      f.inputs.roomCategoryId === rec.roomCategoryId &&
      f.output.pays === 0,
  );
  if (topUp && typeof topUp.inputs.deductible === 'number')
    parts.push(t.topUp(topUp.inputs.deductible));

  parts.push(t.confirm);
  return parts.join(' ');
}

function mostExpensive(branch: BranchResult): RoomOptionResult {
  return branch.options.reduce((a, b) => (b.outOfPocket > a.outOfPocket ? b : a));
}

type Money = (n: number) => string;

type Phrases = {
  policyFirst: (name: string) => string;
  compare: (worst: RoomOptionResult, rec: RoomOptionResult, cut: boolean, saving: number) => string;
  youPay: (amount: number) => string;
  ifFlat: (saving: number) => string;
  askPackage: string;
  topUp: (deductible: number) => string;
  capped: (limit: number) => string;
  noMaternity: (name: string) => string;
  waiting: (name: string, until: string) => string;
  confirm: string;
};

/** BCP-47 tag for dates: Hindi is always Indian; the rest follow the market. */
const tag = (locale: Locale, country: Country) =>
  locale === 'hi' ? 'hi-IN' : `${locale}-${country}`;

/** "20 July 2027" for speech, in the language's own month names. */
const longDate = (iso: string, locale: Locale, country: Country) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(tag(locale, country), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const HI = (money: Money, country: Country): Phrases => {
  const desk = country === 'SG' ? 'business office' : 'TPA desk';
  // Rupees are spoken as words; Singapore dollars are read from digits.
  const rs = (n: number) => (country === 'IN' ? `${hindiWords(n)} rupaye` : money(n));
  /** "Nau hazaar rupaye wale room" for a priced room; the printed label (a package name) otherwise. */
  const room = (o: RoomOptionResult) =>
    o.rentPerDay > 0 ? `${cap(rs(o.rentPerDay))} wale room` : o.label;
  return {
    policyFirst: (name) => `Pehle ${name} ka card ${desk} par dijiye.`,
    compare: (worst, rec, cut, saving) => {
      const pay = `lagbhag ${rs(worst.outOfPocket)} dene padenge.`;
      const lead = cut
        ? `${room(worst)} mein doctor aur operation ke charges bhi zyada hain, aur insurance unpar katauti karega. Aapko ${pay}`
        : `${room(worst)} mein aapko ${pay}`;
      return `${lead} ${room(rec)} maangiye, tab lagbhag ${rs(rec.outOfPocket)}, yaani ${rs(saving)} kam.`;
    },
    youPay: (amount) => `Aapko lagbhag ${rs(amount)} dene padenge.`,
    ifFlat: (saving) =>
      `Agar hospital har room mein ek hi charge leta hai, to fark sirf ${rs(saving)} ka hai. Desk se poochhiye ki doctor aur operation ke charges room ke hisaab se badalte hain ya nahi.`,
    askPackage: 'Yeh package rate hai. Desk se policy limit wale room ka package price poochhiye.',
    topUp: (deductible) =>
      `Top-up policy tabhi kaam aayegi jab is saal ka kharcha ${rs(deductible)} se upar jaaye, isliye saare bill sambhal kar rakhiye.`,
    capped: (limit) =>
      `Dhyaan rahe, is policy mein delivery ki limit ${rs(limit)} hai, kamra koi bhi ho. Usse upar ka kharcha aapko dena hoga.`,
    noMaternity: (name) =>
      `${cap(name)} mein delivery cover nahi hai, isliye yeh poora bill aapko dena hoga.`,
    waiting: (name, until) =>
      `${cap(name)} mein delivery ka waiting period ${until} tak hai, isliye abhi yeh poora bill aapko dena hoga.`,
    confirm: `Sign karne se pehle ${desk} se confirm kar lijiye.`,
  };
};

const EN = (money: Money, country: Country): Phrases => {
  const desk = country === 'SG' ? 'business office' : 'TPA desk';
  /** "the ₹9,000 room" for a priced room; "the Standard Package · Shared Room" otherwise. */
  const room = (o: RoomOptionResult) =>
    o.rentPerDay > 0 ? `the ${money(o.rentPerDay)} room` : `the ${o.label}`;
  return {
    policyFirst: (name) => `First give the ${name} card at the ${desk}.`,
    compare: (worst, rec, cut, saving) => {
      const pay = `pay about ${money(worst.outOfPocket)}.`;
      const lead = cut
        ? `In ${room(worst)} the doctor and operation charges are higher too, and insurance will cut part of them. You would ${pay}`
        : `In ${room(worst)} you would ${pay}`;
      return `${lead} Ask for ${room(rec)}; then about ${money(rec.outOfPocket)}, which is ${money(saving)} less.`;
    },
    youPay: (amount) => `You would pay about ${money(amount)}.`,
    ifFlat: (saving) =>
      `If the hospital charges the same in every room, the difference is only ${money(saving)}. Ask the desk whether the doctor and operation charges change with the room.`,
    askPackage:
      'This is a package rate. Ask the desk for the package price in the room within your policy limit.',
    topUp: (deductible) =>
      `The top-up policy only helps once this year's bills cross ${money(deductible)}, so keep every bill.`,
    capped: (limit) =>
      `Note that this policy pays at most ${money(limit)} for a delivery, whichever room. Anything above that is yours to pay.`,
    noMaternity: (name) =>
      `The ${name} does not cover a delivery, so this whole bill is yours to pay.`,
    waiting: (name, until) =>
      `The ${name} has a waiting period for delivery until ${until}, so this whole bill is yours to pay.`,
    confirm: `Before you sign, confirm with the ${desk}.`,
  };
};

const TA = (money: Money, country: Country): Phrases => {
  const desk = country === 'SG' ? 'பிசினஸ் ஆபிஸில்' : 'TPA டெஸ்க்கில்';
  /** "₹5,000 அறை" for a priced room; the printed label otherwise. */
  const room = (o: RoomOptionResult) => (o.rentPerDay > 0 ? `${money(o.rentPerDay)} அறை` : o.label);
  return {
    policyFirst: (name) => `முதலில் ${name} கார்டை ${desk} கொடுங்கள்.`,
    compare: (worst, rec, cut, saving) => {
      const pay = `சுமார் ${money(worst.outOfPocket)} செலுத்த வேண்டும்.`;
      const lead = cut
        ? `${room(worst)}யில் டாக்டர் மற்றும் ஆபரேஷன் கட்டணங்களும் அதிகம், இன்ஷூரன்ஸ் அவற்றில் ஒரு பகுதியைக் குறைக்கும். நீங்கள் ${pay}`
        : `${room(worst)}யில் நீங்கள் ${pay}`;
      return `${lead} ${room(rec)}யைக் கேளுங்கள்; அப்போது சுமார் ${money(rec.outOfPocket)}, அதாவது ${money(saving)} குறைவு.`;
    },
    youPay: (amount) => `நீங்கள் சுமார் ${money(amount)} செலுத்த வேண்டும்.`,
    ifFlat: (saving) =>
      `எல்லா அறைகளிலும் ஒரே கட்டணம் என்றால், வித்தியாசம் ${money(saving)} மட்டுமே. டாக்டர் மற்றும் ஆபரேஷன் கட்டணங்கள் அறையைப் பொறுத்து மாறுமா என்று டெஸ்க்கில் கேளுங்கள்.`,
    askPackage:
      'இது பேக்கேஜ் விலை. உங்கள் பாலிசி வரம்புக்குள் உள்ள அறையின் பேக்கேஜ் விலையை டெஸ்க்கில் கேளுங்கள்.',
    topUp: (deductible) =>
      `டாப்-அப் பாலிசி இந்த ஆண்டின் பில்கள் ${money(deductible)}-ஐத் தாண்டினால் மட்டுமே உதவும், எனவே எல்லா பில்களையும் பத்திரமாக வையுங்கள்.`,
    capped: (limit) =>
      `கவனிக்கவும், இந்தப் பாலிசி பிரசவத்துக்கு அதிகபட்சம் ${money(limit)} மட்டுமே கொடுக்கும், அறை எதுவாக இருந்தாலும். அதற்கு மேல் நீங்கள் செலுத்த வேண்டும்.`,
    noMaternity: (name) =>
      `${name} பிரசவத்தைக் கவர் செய்யாது, எனவே இந்த முழு பில்லையும் நீங்கள் செலுத்த வேண்டும்.`,
    waiting: (name, until) =>
      `${name}-இல் பிரசவத்துக்கான காத்திருப்புக் காலம் ${until} வரை உள்ளது, எனவே இப்போது இந்த முழு பில்லையும் நீங்கள் செலுத்த வேண்டும்.`,
    confirm: `கையெழுத்திடும் முன் ${desk} உறுதிப்படுத்திக் கொள்ளுங்கள்.`,
  };
};

const ZH = (money: Money, country: Country): Phrases => {
  const desk = country === 'SG' ? '医院商务办公室' : ' TPA 柜台';
  /** "₹5,000的病房" for a priced room; the printed label otherwise. */
  const room = (o: RoomOptionResult) =>
    o.rentPerDay > 0 ? `${money(o.rentPerDay)}的病房` : o.label;
  return {
    policyFirst: (name) => `请先把${name}的卡交给${desk}。`,
    compare: (worst, rec, cut, saving) => {
      const pay = `大约需要自付${money(worst.outOfPocket)}。`;
      const lead = cut
        ? `${room(worst)}的医生费和手术费也更高，保险会扣减其中一部分。您${pay}`
        : `在${room(worst)}您${pay}`;
      return `${lead} 请要求${room(rec)}，这样大约自付${money(rec.outOfPocket)}，少付${money(saving)}。`;
    },
    youPay: (amount) => `您大约需要自付${money(amount)}。`,
    ifFlat: (saving) =>
      `如果医院每种病房的收费都一样，差别只有${money(saving)}。请问柜台，医生费和手术费是否随病房而变。`,
    askPackage: '这是配套价。请向柜台询问您保单限额内病房的配套价格。',
    topUp: (deductible) =>
      `附加保单只有在今年的账单超过${money(deductible)}后才会赔付，所以请保留每一张账单。`,
    capped: (limit) =>
      `请注意，无论住哪种病房，这份保单对分娩最多赔付${money(limit)}。超出部分需要您自付。`,
    noMaternity: (name) => `${name}不承保分娩，所以这整张账单需要您自付。`,
    waiting: (name, until) => `${name}的分娩等待期到${until}才结束，所以目前这整张账单需要您自付。`,
    confirm: `签字前请先与${desk}确认。`,
  };
};

const MS = (money: Money, country: Country): Phrases => {
  const desk = country === 'SG' ? 'pejabat perniagaan hospital' : 'kaunter TPA';
  /** "bilik ₹5,000" for a priced room; the printed label otherwise. */
  const room = (o: RoomOptionResult) =>
    o.rentPerDay > 0 ? `bilik ${money(o.rentPerDay)}` : o.label;
  return {
    policyFirst: (name) => `Serahkan kad ${name} di ${desk} dahulu.`,
    compare: (worst, rec, cut, saving) => {
      const pay = `perlu membayar kira-kira ${money(worst.outOfPocket)}.`;
      const lead = cut
        ? `Di ${room(worst)}, caj doktor dan pembedahan juga lebih tinggi, dan insurans akan memotong sebahagiannya. Anda ${pay}`
        : `Di ${room(worst)} anda ${pay}`;
      return `${lead} Minta ${room(rec)}; kemudian kira-kira ${money(rec.outOfPocket)}, iaitu ${money(saving)} kurang.`;
    },
    youPay: (amount) => `Anda perlu membayar kira-kira ${money(amount)}.`,
    ifFlat: (saving) =>
      `Jika hospital mengenakan caj yang sama di setiap bilik, bezanya hanya ${money(saving)}. Tanya kaunter sama ada caj doktor dan pembedahan berubah mengikut bilik.`,
    askPackage: 'Ini kadar pakej. Tanya kaunter harga pakej untuk bilik dalam had polisi anda.',
    topUp: (deductible) =>
      `Polisi tambahan hanya membantu selepas bil tahun ini melebihi ${money(deductible)}, jadi simpan setiap bil.`,
    capped: (limit) =>
      `Perhatian, polisi ini membayar paling banyak ${money(limit)} untuk bersalin, apa pun biliknya. Lebihan itu perlu anda bayar.`,
    noMaternity: (name) =>
      `${name} tidak melindungi bersalin, jadi seluruh bil ini perlu anda bayar.`,
    waiting: (name, until) =>
      `${name} mempunyai tempoh menunggu untuk bersalin sehingga ${until}, jadi buat masa ini seluruh bil ini perlu anda bayar.`,
    confirm: `Sebelum menandatangani, sahkan dengan ${desk}.`,
  };
};

const PHRASES: Record<Locale, (money: Money, country: Country) => Phrases> = {
  en: EN,
  hi: HI,
  ta: TA,
  zh: ZH,
  ms: MS,
};
