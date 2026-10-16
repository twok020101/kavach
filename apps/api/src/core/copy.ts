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
  };
};

const en: Copy = {
  room: (r) => `${r.label} (${formatInr(r.rentPerDay)}/day)`,
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
    youPay: (r) => `${r.label} (${formatInr(r.rentPerDay)}/day): you pay about`,
    saving: 'You save about',
  },
  ask: {
    title: 'Ask the desk',
    getRoom: (r) => `Can we get the ${r.label} room (${formatInr(r.rentPerDay)}/day)?`,
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
  sameCharges: (lower, quoted) =>
    `Are the surgeon, OT, nursing and doctor charges in the ${en.room(lower)} room different from the ${en.room(quoted)} room, or the same for every room?`,
  packagePrice: (procedure, lower) =>
    `What is the package price for ${procedure} in the ${en.room(lower)} room?`,
  text: {
    switchRoom: (rec, recPays, worst, worstPays, saving) =>
      `Ask for the ${formatInr(rec.rentPerDay)} room: you pay about ${formatInr(recPays)} instead of about ${formatInr(worstPays)} in the ${formatInr(worst.rentPerDay)} room (${formatInr(saving)} less).`,
    youPay: (amount) => `You pay about ${formatInr(amount)}.`,
    firstCard: (policy) => `Give the ${policy} card at the TPA desk first.`,
    ifFlat: (saving) =>
      `If every room has the same charges, the difference is only ${formatInr(saving)}; ask the desk.`,
  },
};

const hi: Copy = {
  room: (r) => `${r.label} (${formatInr(r.rentPerDay)}/दिन)`,
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
    youPay: (r) => `${r.label} (${formatInr(r.rentPerDay)}/दिन): आपको लगभग`,
    saving: 'बचत लगभग',
  },
  ask: {
    title: 'डेस्क से पूछिए',
    getRoom: (r) => `क्या ${r.label} कमरा (${formatInr(r.rentPerDay)}/दिन) मिलेगा?`,
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
  sameCharges: (lower, quoted) =>
    `क्या ${hi.room(lower)} कमरे में सर्जन, OT, नर्सिंग और डॉक्टर के चार्ज ${hi.room(quoted)} कमरे से अलग हैं, या हर कमरे में एक जैसे?`,
  packagePrice: (procedure, lower) =>
    `${hi.room(lower)} कमरे में ${procedure} का पैकेज रेट कितना है?`,
  text: {
    switchRoom: (rec, recPays, worst, worstPays, saving) =>
      `${formatInr(rec.rentPerDay)} वाला कमरा माँगिए: लगभग ${formatInr(recPays)} देने होंगे, ${formatInr(worst.rentPerDay)} वाले में लगभग ${formatInr(worstPays)} (${formatInr(saving)} कम)।`,
    youPay: (amount) => `आपको लगभग ${formatInr(amount)} देने होंगे।`,
    firstCard: (policy) => `TPA डेस्क पर पहले ${policy} का कार्ड दीजिए।`,
    ifFlat: (saving) =>
      `अगर हर कमरे में चार्ज एक जैसे हैं, तो फ़र्क़ सिर्फ़ ${formatInr(saving)} का है; डेस्क से पूछिए।`,
  },
};

export const COPY: Record<Locale, Copy> = { en, hi };
