import { formatInr } from '@kavach/engine';
import type { Locale, RoomCategory } from '@kavach/schemas';

/**
 * Every sentence the desk core writes, in English and Hindi. `say*` lines are spoken, so their
 * Hindi is in Latin script like the engine's `buildDeskSay`; everything else is shown on screen.
 * Amounts arrive already computed by the engine (or printed on the estimate); this only formats them.
 */
export type Copy = {
  room: (r: RoomCategory) => string;
  needEstimate: { text: string; say: string };
  unclear: { title: string; intro: string; outro: string; say: string };
  noCover: {
    title: (name: string) => string;
    body: (name: string, date: string) => string;
    say: (name: string) => string;
  };
  order: { title: string; pays: (name: string) => string };
  compare: {
    title: string;
    cut: (rent: number) => string;
    plain: string;
    youPay: (r: RoomCategory) => string;
    saving: string;
  };
  ask: {
    title: string;
    getRoom: (r: RoomCategory) => string;
    cashless: (policy: string) => string;
    confirm: string;
  };
  branch: { title: string; body: string };
  topUp: { title: string; body: (name: string, deductible: number) => string; deductible: string };
  cap: {
    title: string;
    body: (
      policy: string,
      limit: number,
      csection: number | undefined,
      newbornDays: number,
    ) => string;
    next: string;
    limit: string;
    above: string;
  };
  /** The policy has no maternity benefit at all (R-MT-001 with limit 0). */
  noMaternity: { title: string; body: (policy: string) => string };
  /** The maternity waiting period runs until `until` (R-MT-002). */
  waiting: { title: string; body: (policy: string, until: string) => string };
  sameCharges: (lower: RoomCategory, quoted: RoomCategory) => string;
  packagePrice: (procedure: string, lower: RoomCategory) => string;
  text: {
    switchRoom: (
      rec: RoomCategory,
      recPays: number,
      worst: RoomCategory,
      worstPays: number,
      saving: number,
    ) => string;
    youPay: (amount: number) => string;
    firstCard: (policy: string) => string;
    ifFlat: (saving: number) => string;
    capped: (limit: number) => string;
    /** A follow-up about one named room: what it costs against the cheapest option. */
    roomPick: (room: RoomCategory, pays: number, best: RoomCategory, bestPays: number) => string;
    /** A follow-up that names no room: what each room costs. */
    eachRoom: (items: { room: RoomCategory; pays: number }[]) => string;
    /** Room rules (attendants, visitors, food) are the hospital's, not the policy's. */
    hospitalRules: string;
  };
};

/** "20 July 2027" in the screen's language. */
const longDate = (iso: string, locale: Locale) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(locale === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/** A room with a per-day rent reads "Deluxe (₹9,000/day)"; a package reads by its label. */
const roomEn = (r: RoomCategory) =>
  r.rentPerDay > 0 ? `${r.label} (${formatInr(r.rentPerDay)}/day)` : r.label;
const roomHi = (r: RoomCategory) =>
  r.rentPerDay > 0 ? `${r.label} (${formatInr(r.rentPerDay)}/दिन)` : r.label;
/** "the ₹9,000 room" or "the Standard Package · Shared Room". */
const shortEn = (r: RoomCategory) =>
  r.rentPerDay > 0 ? `the ${formatInr(r.rentPerDay)} room` : `the ${r.label}`;
const shortHi = (r: RoomCategory) =>
  r.rentPerDay > 0 ? `${formatInr(r.rentPerDay)} वाला कमरा` : r.label;

const en: Copy = {
  room: roomEn,
  needEstimate: {
    text: 'Please send a photo of the hospital estimate, so I can check the room charges.',
    say: 'Please show me the hospital estimate. Take a photo of it, and I will check the room charges.',
  },
  unclear: {
    title: 'Check the estimate first',
    intro: "Some numbers on the estimate could not be read or don't add up:",
    outro:
      'Please take a clearer photo, or check these numbers with the desk. I will not give an amount until they are right.',
    say: "Some numbers on the estimate are not clear, or don't add up. Please take a clearer photo, or check them with the desk.",
  },
  noCover: {
    title: (name) => `No health cover found for ${name}`,
    body: (name, date) =>
      `None of the family's health policies covers ${name} on ${date}. Treatment comes first. Ask the hospital for the cost, and check whether ${name} is eligible for Ayushman Bharat (PM-JAY).`,
    say: (name) =>
      `I could not find a health policy that covers ${name} today. Treatment comes first. Ask the hospital for the cost, and check Ayushman Bharat eligibility.`,
  },
  order: { title: 'Give this card first', pays: (name) => `${name} pays about` },
  compare: {
    title: 'Which room',
    cut: (rent) =>
      `In the ${formatInr(rent)} room the doctor and operation charges are higher too, and insurance cuts part of them.`,
    plain: 'What you would pay in each room.',
    youPay: (r) => `${roomEn(r)}: you pay about`,
    saving: 'You save about',
  },
  ask: {
    title: 'Ask the desk',
    getRoom: (r) => `Can we get ${shortEn(r)}?`,
    cashless: (policy) => `Please start cashless approval with the ${policy}.`,
    confirm: 'Confirm the amounts with the TPA desk before you sign.',
  },
  branch: {
    title: 'If every room has the same charges',
    body: 'Then insurance cannot cut the doctor and operation charges, and only the room rent differs. Ask the desk which it is.',
  },
  topUp: {
    title: 'Top-up policy',
    body: (name, deductible) =>
      `The ${name} pays only once this year's bills cross ${formatInr(deductible)}. Keep every bill and the discharge summary.`,
    deductible: 'Pays only above',
  },
  cap: {
    title: 'Maternity limit on this policy',
    body: (policy, limit, csection, newbornDays) =>
      `The ${policy} pays at most ${formatInr(limit)} for a normal delivery${csection && csection !== limit ? ` (${formatInr(csection)} for a caesarean)` : ''}, whichever room you take. The baby's hospital expenses in the first ${newbornDays} days count inside this limit, not on top of it.`,
    next: 'For the next time: retail health plans with maternity exist, but every one has a waiting period of a year or more, so they only help if bought well before a pregnancy. Add the baby to your policy within 90 days of birth.',
    limit: 'Policy pays at most',
    above: 'Above the limit (yours to pay)',
  },
  noMaternity: {
    title: 'No maternity cover on this policy',
    body: (policy) =>
      `The ${policy} does not cover a delivery, so the hospital bill is yours to pay. Check the exclusions in the policy schedule, and ask the TPA desk to confirm before you sign.`,
  },
  waiting: {
    title: 'Maternity waiting period not over',
    body: (policy, until) =>
      `The ${policy} covers a delivery only from ${longDate(until, 'en')}, so this hospital bill is yours to pay. Ask the TPA desk to confirm the date before you sign.`,
  },
  sameCharges: (lower, quoted) =>
    `Are the surgeon, OT, nursing and doctor charges in the ${en.room(lower)} room different from the ${en.room(quoted)} room, or the same for every room?`,
  packagePrice: (procedure, lower) =>
    `What is the package price for ${procedure} in the ${en.room(lower)} room?`,
  text: {
    switchRoom: (rec, recPays, worst, worstPays, saving) =>
      `Ask for ${shortEn(rec)}: you pay about ${formatInr(recPays)} instead of about ${formatInr(worstPays)} in ${shortEn(worst)} (${formatInr(saving)} less).`,
    youPay: (amount) => `You pay about ${formatInr(amount)}.`,
    firstCard: (policy) => `Give the ${policy} card at the TPA desk first.`,
    ifFlat: (saving) =>
      `If every room has the same charges, the difference is only ${formatInr(saving)}; ask the desk.`,
    capped: (limit) =>
      `This policy pays at most ${formatInr(limit)} for the delivery, whichever room.`,
    roomPick: (room, pays, best, bestPays) =>
      room.id === best.id
        ? `${roomEn(room)} is the cheapest for you: about ${formatInr(pays)}.`
        : `${room.label} (${formatInr(room.rentPerDay)}/day): you pay about ${formatInr(pays)}, which is ${formatInr(pays - bestPays)} more than the ${best.label} (${formatInr(bestPays)}).`,
    eachRoom: (items) =>
      `What you pay in each room: ${items.map((i) => `${i.room.label} ${formatInr(i.pays)}`).join(' · ')}.`,
    hospitalRules:
      'Rules about attendants, visitors or food are set by the hospital, not the policy; any of these rooms works with your cover, only what you pay changes.',
  },
};

const hi: Copy = {
  room: roomHi,
  needEstimate: {
    text: 'अस्पताल के एस्टिमेट की फ़ोटो भेजिए, ताकि मैं कमरे के चार्ज देख सकूँ।',
    say: 'Hospital ka estimate dikhaiye. Uski photo lijiye, phir room ke charges dekhte hain.',
  },
  unclear: {
    title: 'पहले एस्टिमेट जाँचिए',
    intro: 'एस्टिमेट के कुछ नंबर पढ़े नहीं जा सके या जोड़ नहीं मिल रहा:',
    outro:
      'साफ़ फ़ोटो लीजिए, या ये नंबर डेस्क से पूछ लीजिए। नंबर सही होने तक कोई रक़म बताना ठीक नहीं।',
    say: 'Estimate ke kuch numbers saaf nahi hain, ya jod nahi mil raha. Ek saaf photo lijiye, ya desk se poochh lijiye.',
  },
  noCover: {
    title: (name) => `${name} के लिए कोई हेल्थ पॉलिसी नहीं मिली`,
    body: (name, date) =>
      `${date} को परिवार की कोई भी हेल्थ पॉलिसी ${name} को कवर नहीं करती। इलाज पहले है। अस्पताल से ख़र्च पूछिए, और देखिए कि ${name} आयुष्मान भारत (PM-JAY) के लिए पात्र हैं या नहीं।`,
    say: (name) =>
      `${name} ke liye aaj koi health policy nahi mili. Ilaaj pehle hai. Hospital se kharcha poochhiye, aur Ayushman Bharat ki eligibility check kijiye.`,
  },
  order: { title: 'पहले यह कार्ड दीजिए', pays: (name) => `${name} लगभग देगी` },
  compare: {
    title: 'कौन सा कमरा',
    cut: (rent) =>
      `${formatInr(rent)} वाले कमरे में डॉक्टर और ऑपरेशन के चार्ज भी ज़्यादा हैं, और बीमा उन पर कटौती करेगा।`,
    plain: 'हर कमरे में आपको कितना देना होगा।',
    youPay: (r) => `${roomHi(r)}: आपको लगभग`,
    saving: 'बचत लगभग',
  },
  ask: {
    title: 'डेस्क से पूछिए',
    getRoom: (r) => `क्या ${shortHi(r)} मिलेगा?`,
    cashless: (policy) => `${policy} से कैशलेस अप्रूवल शुरू कीजिए।`,
    confirm: 'साइन करने से पहले TPA डेस्क से रक़म पक्की कर लीजिए।',
  },
  branch: {
    title: 'अगर हर कमरे में चार्ज एक जैसे हों',
    body: 'तब बीमा डॉक्टर और ऑपरेशन के चार्ज नहीं काट सकता, फ़र्क़ सिर्फ़ कमरे के किराए का है। डेस्क से पूछिए कि कौन सा सही है।',
  },
  topUp: {
    title: 'टॉप-अप पॉलिसी',
    body: (name, deductible) =>
      `${name} तभी पैसे देगी जब इस साल का ख़र्च ${formatInr(deductible)} से ऊपर जाए। सारे बिल और डिस्चार्ज समरी संभाल कर रखिए।`,
    deductible: 'इससे ऊपर ही देगी',
  },
  cap: {
    title: 'इस पॉलिसी में मैटरनिटी की लिमिट',
    body: (policy, limit, csection, newbornDays) =>
      `${policy} नॉर्मल डिलीवरी के लिए ज़्यादा से ज़्यादा ${formatInr(limit)} देगी${csection && csection !== limit ? ` (सिज़ेरियन के लिए ${formatInr(csection)})` : ''}, कमरा कोई भी हो। बच्चे के पहले ${newbornDays} दिनों का अस्पताल ख़र्च इसी लिमिट के अंदर गिना जाता है, ऊपर से नहीं।`,
    next: 'अगली बार के लिए: मैटरनिटी वाली रिटेल हेल्थ पॉलिसियाँ मिलती हैं, पर हर एक में साल भर या ज़्यादा का वेटिंग पीरियड होता है, इसलिए प्रेग्नेंसी से काफ़ी पहले लेने पर ही काम आती हैं। जन्म के 90 दिन के अंदर बच्चे को पॉलिसी में जोड़िए।',
    limit: 'पॉलिसी ज़्यादा से ज़्यादा देगी',
    above: 'लिमिट से ऊपर (आपको देना होगा)',
  },
  noMaternity: {
    title: 'इस पॉलिसी में मैटरनिटी कवर नहीं है',
    body: (policy) =>
      `${policy} डिलीवरी को कवर नहीं करती, इसलिए अस्पताल का बिल आपको देना होगा। पॉलिसी शेड्यूल के एक्सक्लूज़न देखिए, और साइन करने से पहले TPA डेस्क से पुष्टि कर लीजिए।`,
  },
  waiting: {
    title: 'मैटरनिटी का वेटिंग पीरियड अभी पूरा नहीं हुआ',
    body: (policy, until) =>
      `${policy} डिलीवरी को ${longDate(until, 'hi')} से ही कवर करेगी, इसलिए यह अस्पताल का बिल आपको देना होगा। साइन करने से पहले TPA डेस्क से तारीख़ की पुष्टि कर लीजिए।`,
  },
  sameCharges: (lower, quoted) =>
    `क्या ${hi.room(lower)} कमरे में सर्जन, OT, नर्सिंग और डॉक्टर के चार्ज ${hi.room(quoted)} कमरे से अलग हैं, या हर कमरे में एक जैसे?`,
  packagePrice: (procedure, lower) =>
    `${hi.room(lower)} कमरे में ${procedure} का पैकेज रेट कितना है?`,
  text: {
    switchRoom: (rec, recPays, worst, worstPays, saving) =>
      `${shortHi(rec)} माँगिए: लगभग ${formatInr(recPays)} देने होंगे, ${shortHi(worst)} में लगभग ${formatInr(worstPays)} (${formatInr(saving)} कम)।`,
    youPay: (amount) => `आपको लगभग ${formatInr(amount)} देने होंगे।`,
    firstCard: (policy) => `TPA डेस्क पर पहले ${policy} का कार्ड दीजिए।`,
    ifFlat: (saving) =>
      `अगर हर कमरे में चार्ज एक जैसे हैं, तो फ़र्क़ सिर्फ़ ${formatInr(saving)} का है; डेस्क से पूछिए।`,
    capped: (limit) =>
      `यह पॉलिसी डिलीवरी के लिए ज़्यादा से ज़्यादा ${formatInr(limit)} देगी, कमरा कोई भी हो।`,
    roomPick: (room, pays, best, bestPays) =>
      room.id === best.id
        ? `${roomHi(room)} आपके लिए सबसे सस्ता है: लगभग ${formatInr(pays)}।`
        : `${room.label} (${formatInr(room.rentPerDay)}/दिन): आपको लगभग ${formatInr(pays)} देने होंगे, यानी ${best.label} (${formatInr(bestPays)}) से ${formatInr(pays - bestPays)} ज़्यादा।`,
    eachRoom: (items) =>
      `हर कमरे में आपको कितना देना होगा: ${items.map((i) => `${i.room.label} ${formatInr(i.pays)}`).join(' · ')}।`,
    hospitalRules:
      'अटेंडेंट, विज़िटर या खाने के नियम अस्पताल तय करता है, पॉलिसी नहीं; इनमें से कोई भी कमरा आपके कवर में चलेगा, बस आपका ख़र्च बदलेगा।',
  },
};

export const COPY: Record<Locale, Copy> = { en, hi };
