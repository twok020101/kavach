import type { BranchResult, DeskEvaluation, Locale, RoomOptionResult } from '@kavach/schemas';
import { formatInr } from './money';

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
};

/**
 * The line the desk agent speaks, built only from engine numbers so the agent never composes one.
 * Hindi amounts are spoken as words; English amounts use Indian digit grouping.
 */
export function buildDeskSay(
  evaluation: DeskEvaluation,
  locale: Locale,
  options: DeskSayOptions = {},
): string {
  const t = locale === 'hi' ? HI : EN;
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

  if (alternate) parts.push(t.ifFlat(alternate.saving));
  if (primary.billingType === 'package') parts.push(t.askPackage);

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

type Phrases = {
  policyFirst: (name: string) => string;
  compare: (worst: RoomOptionResult, rec: RoomOptionResult, cut: boolean, saving: number) => string;
  youPay: (amount: number) => string;
  ifFlat: (saving: number) => string;
  askPackage: string;
  topUp: (deductible: number) => string;
  capped: (limit: number) => string;
  confirm: string;
};

const rs = (n: number) => `${hindiWords(n)} rupaye`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const HI: Phrases = {
  policyFirst: (name) => `Pehle ${name} ka card TPA desk par dijiye.`,
  compare: (worst, rec, cut, saving) => {
    const pay = `lagbhag ${rs(worst.outOfPocket)} dene padenge.`;
    const lead = cut
      ? `${cap(rs(worst.rentPerDay))} wale room mein doctor aur operation ke charges bhi zyada hain, aur insurance unpar katauti karega. Aapko ${pay}`
      : `${cap(rs(worst.rentPerDay))} wale room mein aapko ${pay}`;
    return `${lead} ${cap(rs(rec.rentPerDay))} wala room maangiye, tab lagbhag ${rs(rec.outOfPocket)}, yaani ${rs(saving)} kam.`;
  },
  youPay: (amount) => `Aapko lagbhag ${rs(amount)} dene padenge.`,
  ifFlat: (saving) =>
    `Agar hospital har room mein ek hi charge leta hai, to fark sirf ${rs(saving)} ka hai. Desk se poochhiye ki doctor aur operation ke charges room ke hisaab se badalte hain ya nahi.`,
  askPackage: 'Yeh package rate hai. Desk se policy limit wale room ka package price poochhiye.',
  topUp: (deductible) =>
    `Top-up policy tabhi kaam aayegi jab is saal ka kharcha ${rs(deductible)} se upar jaaye, isliye saare bill sambhal kar rakhiye.`,
  capped: (limit) =>
    `Dhyaan rahe, is policy mein delivery ki limit ${rs(limit)} hai, kamra koi bhi ho. Usse upar ka kharcha aapko dena hoga.`,
  confirm: 'Sign karne se pehle TPA desk se confirm kar lijiye.',
};

const EN: Phrases = {
  policyFirst: (name) => `First give the ${name} card at the TPA desk.`,
  compare: (worst, rec, cut, saving) => {
    const pay = `pay about ${formatInr(worst.outOfPocket)}.`;
    const lead = cut
      ? `In the ${formatInr(worst.rentPerDay)} room the doctor and operation charges are higher too, and insurance will cut part of them. You would ${pay}`
      : `In the ${formatInr(worst.rentPerDay)} room you would ${pay}`;
    return `${lead} Ask for the ${formatInr(rec.rentPerDay)} room; then about ${formatInr(rec.outOfPocket)}, which is ${formatInr(saving)} less.`;
  },
  youPay: (amount) => `You would pay about ${formatInr(amount)}.`,
  ifFlat: (saving) =>
    `If the hospital charges the same in every room, the difference is only ${formatInr(saving)}. Ask the desk whether the doctor and operation charges change with the room.`,
  askPackage:
    'This is a package rate. Ask the desk for the package price in the room within your policy limit.',
  topUp: (deductible) =>
    `The top-up policy only helps once this year's bills cross ${formatInr(deductible)}, so keep every bill.`,
  capped: (limit) =>
    `Note that this policy pays at most ${formatInr(limit)} for a delivery, whichever room. Anything above that is yours to pay.`,
  confirm: 'Before you sign, confirm with the TPA desk.',
};
