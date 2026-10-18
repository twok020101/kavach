import { formatMoney } from '@kavach/engine';
import type { Country, Locale, RoomCategory } from '@kavach/schemas';
import { languageTag } from './locales';

/**
 * Every sentence the desk core writes, in five languages. `say*` lines are spoken, so their
 * Hindi is in Latin script like the engine's `buildDeskSay`; Tamil, Mandarin and Malay speak in
 * their own script; everything else is shown on screen. Amounts arrive already computed by the
 * engine (or printed on the estimate); this only formats them, in the household's currency.
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

type Money = (n: number) => string;
type Factory = (money: Money, country: Country) => Copy;

/** "20 July 2027" in the screen's language. */
const longDate = (iso: string, locale: Locale, country: Country) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(languageTag(locale, country), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// ---------------------------------------------------------------------------------------- English

const en: Factory = (money, country) => {
  /** Where the family asks: the TPA desk in India; the hospital's business office in Singapore. */
  const desk = country === 'SG' ? 'business office' : 'TPA desk';
  const safetyNet =
    country === 'SG'
      ? `ask the medical social worker about MediFund`
      : `check whether they are eligible for Ayushman Bharat (PM-JAY)`;
  /** A room with a per-day rent reads "Deluxe (₹9,000/day)"; a package reads by its label. */
  const room = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `${r.label} (${money(r.rentPerDay)}/day)` : r.label;
  /** "the ₹9,000 room" or "the Standard Package · Shared Room". */
  const short = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `the ${money(r.rentPerDay)} room` : `the ${r.label}`;
  const copy: Copy = {
    room,
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
        `None of the family's health policies covers ${name} on ${date}. Treatment comes first. Ask the hospital for the cost, and ${safetyNet}.`,
      say: (name) =>
        `I could not find a health policy that covers ${name} today. Treatment comes first. Ask the hospital for the cost, and ${safetyNet}.`,
    },
    order: { title: 'Give this card first', pays: (name) => `${name} pays about` },
    compare: {
      title: 'Which room',
      cut: (rent) =>
        `In the ${money(rent)} room the doctor and operation charges are higher too, and insurance cuts part of them.`,
      plain: 'What you would pay in each room.',
      youPay: (r) => `${room(r)}: you pay about`,
      saving: 'You save about',
    },
    ask: {
      title: 'Ask the desk',
      getRoom: (r) => `Can we get ${short(r)}?`,
      cashless: (policy) =>
        country === 'SG'
          ? `Please start pre-authorisation with the ${policy}.`
          : `Please start cashless approval with the ${policy}.`,
      confirm: `Confirm the amounts with the ${desk} before you sign.`,
    },
    branch: {
      title: 'If every room has the same charges',
      body: 'Then insurance cannot cut the doctor and operation charges, and only the room rent differs. Ask the desk which it is.',
    },
    topUp: {
      title: 'Top-up policy',
      body: (name, deductible) =>
        `The ${name} pays only once this year's bills cross ${money(deductible)}. Keep every bill and the discharge summary.`,
      deductible: 'Pays only above',
    },
    cap: {
      title: 'Maternity limit on this policy',
      body: (policy, limit, csection, newbornDays) =>
        `The ${policy} pays at most ${money(limit)} for a normal delivery${csection && csection !== limit ? ` (${money(csection)} for a caesarean)` : ''}, whichever room you take. The baby's hospital expenses in the first ${newbornDays} days count inside this limit, not on top of it.`,
      next: 'For the next time: retail health plans with maternity exist, but every one has a waiting period of a year or more, so they only help if bought well before a pregnancy. Add the baby to your policy within 90 days of birth.',
      limit: 'Policy pays at most',
      above: 'Above the limit (yours to pay)',
    },
    noMaternity: {
      title: 'No maternity cover on this policy',
      body: (policy) =>
        `The ${policy} does not cover a delivery, so the hospital bill is yours to pay. Check the exclusions in the policy schedule, and ask the ${desk} to confirm before you sign.`,
    },
    waiting: {
      title: 'Maternity waiting period not over',
      body: (policy, until) =>
        `The ${policy} covers a delivery only from ${longDate(until, 'en', country)}, so this hospital bill is yours to pay. Ask the ${desk} to confirm the date before you sign.`,
    },
    sameCharges: (lower, quoted) =>
      `Are the surgeon, OT, nursing and doctor charges in the ${room(lower)} room different from the ${room(quoted)} room, or the same for every room?`,
    packagePrice: (procedure, lower) =>
      `What is the package price for ${procedure} in the ${room(lower)} room?`,
    text: {
      switchRoom: (rec, recPays, worst, worstPays, saving) =>
        `Ask for ${short(rec)}: you pay about ${money(recPays)} instead of about ${money(worstPays)} in ${short(worst)} (${money(saving)} less).`,
      youPay: (amount) => `You pay about ${money(amount)}.`,
      firstCard: (policy) => `Give the ${policy} card at the ${desk} first.`,
      ifFlat: (saving) =>
        `If every room has the same charges, the difference is only ${money(saving)}; ask the desk.`,
      capped: (limit) =>
        `This policy pays at most ${money(limit)} for the delivery, whichever room.`,
      roomPick: (r, pays, best, bestPays) =>
        r.id === best.id
          ? `${room(r)} is the cheapest for you: about ${money(pays)}.`
          : `${r.label} (${money(r.rentPerDay)}/day): you pay about ${money(pays)}, which is ${money(pays - bestPays)} more than the ${best.label} (${money(bestPays)}).`,
      eachRoom: (items) =>
        `What you pay in each room: ${items.map((i) => `${i.room.label} ${money(i.pays)}`).join(' · ')}.`,
      hospitalRules:
        'Rules about attendants, visitors or food are set by the hospital, not the policy; any of these rooms works with your cover, only what you pay changes.',
    },
  };
  return copy;
};

// ------------------------------------------------------------------------------------------ Hindi

const hi: Factory = (money, country) => {
  const desk = country === 'SG' ? 'बिज़नेस ऑफ़िस' : 'TPA डेस्क';
  const deskSay = country === 'SG' ? 'business office' : 'TPA desk';
  const safetyNet =
    country === 'SG'
      ? 'मेडिकल सोशल वर्कर से MediFund के बारे में पूछिए'
      : `देखिए कि वे आयुष्मान भारत (PM-JAY) के लिए पात्र हैं या नहीं`;
  const room = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `${r.label} (${money(r.rentPerDay)}/दिन)` : r.label;
  const short = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `${money(r.rentPerDay)} वाला कमरा` : r.label;
  const copy: Copy = {
    room,
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
        `${date} को परिवार की कोई भी हेल्थ पॉलिसी ${name} को कवर नहीं करती। इलाज पहले है। अस्पताल से ख़र्च पूछिए, और ${safetyNet}।`,
      say: (name) =>
        country === 'SG'
          ? `${name} ke liye aaj koi health policy nahi mili. Ilaaj pehle hai. Hospital se kharcha poochhiye, aur medical social worker se MediFund ke baare mein poochhiye.`
          : `${name} ke liye aaj koi health policy nahi mili. Ilaaj pehle hai. Hospital se kharcha poochhiye, aur Ayushman Bharat ki eligibility check kijiye.`,
    },
    order: { title: 'पहले यह कार्ड दीजिए', pays: (name) => `${name} लगभग देगी` },
    compare: {
      title: 'कौन सा कमरा',
      cut: (rent) =>
        `${money(rent)} वाले कमरे में डॉक्टर और ऑपरेशन के चार्ज भी ज़्यादा हैं, और बीमा उन पर कटौती करेगा।`,
      plain: 'हर कमरे में आपको कितना देना होगा।',
      youPay: (r) => `${room(r)}: आपको लगभग`,
      saving: 'बचत लगभग',
    },
    ask: {
      title: 'डेस्क से पूछिए',
      getRoom: (r) => `क्या ${short(r)} मिलेगा?`,
      cashless: (policy) =>
        country === 'SG'
          ? `${policy} से प्री-ऑथराइज़ेशन शुरू कीजिए।`
          : `${policy} से कैशलेस अप्रूवल शुरू कीजिए।`,
      confirm: `साइन करने से पहले ${desk} से रक़म पक्की कर लीजिए।`,
    },
    branch: {
      title: 'अगर हर कमरे में चार्ज एक जैसे हों',
      body: 'तब बीमा डॉक्टर और ऑपरेशन के चार्ज नहीं काट सकता, फ़र्क़ सिर्फ़ कमरे के किराए का है। डेस्क से पूछिए कि कौन सा सही है।',
    },
    topUp: {
      title: 'टॉप-अप पॉलिसी',
      body: (name, deductible) =>
        `${name} तभी पैसे देगी जब इस साल का ख़र्च ${money(deductible)} से ऊपर जाए। सारे बिल और डिस्चार्ज समरी संभाल कर रखिए।`,
      deductible: 'इससे ऊपर ही देगी',
    },
    cap: {
      title: 'इस पॉलिसी में मैटरनिटी की लिमिट',
      body: (policy, limit, csection, newbornDays) =>
        `${policy} नॉर्मल डिलीवरी के लिए ज़्यादा से ज़्यादा ${money(limit)} देगी${csection && csection !== limit ? ` (सिज़ेरियन के लिए ${money(csection)})` : ''}, कमरा कोई भी हो। बच्चे के पहले ${newbornDays} दिनों का अस्पताल ख़र्च इसी लिमिट के अंदर गिना जाता है, ऊपर से नहीं।`,
      next: 'अगली बार के लिए: मैटरनिटी वाली रिटेल हेल्थ पॉलिसियाँ मिलती हैं, पर हर एक में साल भर या ज़्यादा का वेटिंग पीरियड होता है, इसलिए प्रेग्नेंसी से काफ़ी पहले लेने पर ही काम आती हैं। जन्म के 90 दिन के अंदर बच्चे को पॉलिसी में जोड़िए।',
      limit: 'पॉलिसी ज़्यादा से ज़्यादा देगी',
      above: 'लिमिट से ऊपर (आपको देना होगा)',
    },
    noMaternity: {
      title: 'इस पॉलिसी में मैटरनिटी कवर नहीं है',
      body: (policy) =>
        `${policy} डिलीवरी को कवर नहीं करती, इसलिए अस्पताल का बिल आपको देना होगा। पॉलिसी शेड्यूल के एक्सक्लूज़न देखिए, और साइन करने से पहले ${desk} से पुष्टि कर लीजिए।`,
    },
    waiting: {
      title: 'मैटरनिटी का वेटिंग पीरियड अभी पूरा नहीं हुआ',
      body: (policy, until) =>
        `${policy} डिलीवरी को ${longDate(until, 'hi', country)} से ही कवर करेगी, इसलिए यह अस्पताल का बिल आपको देना होगा। साइन करने से पहले ${desk} से तारीख़ की पुष्टि कर लीजिए।`,
    },
    sameCharges: (lower, quoted) =>
      `क्या ${room(lower)} कमरे में सर्जन, OT, नर्सिंग और डॉक्टर के चार्ज ${room(quoted)} कमरे से अलग हैं, या हर कमरे में एक जैसे?`,
    packagePrice: (procedure, lower) =>
      `${room(lower)} कमरे में ${procedure} का पैकेज रेट कितना है?`,
    text: {
      switchRoom: (rec, recPays, worst, worstPays, saving) =>
        `${short(rec)} माँगिए: लगभग ${money(recPays)} देने होंगे, ${short(worst)} में लगभग ${money(worstPays)} (${money(saving)} कम)।`,
      youPay: (amount) => `आपको लगभग ${money(amount)} देने होंगे।`,
      firstCard: (policy) => `${desk} पर पहले ${policy} का कार्ड दीजिए।`,
      ifFlat: (saving) =>
        `अगर हर कमरे में चार्ज एक जैसे हैं, तो फ़र्क़ सिर्फ़ ${money(saving)} का है; डेस्क से पूछिए।`,
      capped: (limit) =>
        `यह पॉलिसी डिलीवरी के लिए ज़्यादा से ज़्यादा ${money(limit)} देगी, कमरा कोई भी हो।`,
      roomPick: (r, pays, best, bestPays) =>
        r.id === best.id
          ? `${room(r)} आपके लिए सबसे सस्ता है: लगभग ${money(pays)}।`
          : `${r.label} (${money(r.rentPerDay)}/दिन): आपको लगभग ${money(pays)} देने होंगे, यानी ${best.label} (${money(bestPays)}) से ${money(pays - bestPays)} ज़्यादा।`,
      eachRoom: (items) =>
        `हर कमरे में आपको कितना देना होगा: ${items.map((i) => `${i.room.label} ${money(i.pays)}`).join(' · ')}।`,
      hospitalRules:
        'अटेंडेंट, विज़िटर या खाने के नियम अस्पताल तय करता है, पॉलिसी नहीं; इनमें से कोई भी कमरा आपके कवर में चलेगा, बस आपका ख़र्च बदलेगा।',
    },
  };
  void deskSay;
  return copy;
};

// ------------------------------------------------------------------------------------------ Tamil

const ta: Factory = (money, country) => {
  const desk = country === 'SG' ? 'பிசினஸ் ஆஃபீஸ்' : 'TPA டெஸ்க்';
  const safetyNet =
    country === 'SG'
      ? 'மெடிக்கல் சோஷியல் வொர்க்கரிடம் MediFund பற்றிக் கேளுங்கள்'
      : 'ஆயுஷ்மான் பாரத் (PM-JAY) தகுதி உள்ளதா என்று பாருங்கள்';
  const room = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `${r.label} (${money(r.rentPerDay)}/நாள்)` : r.label;
  const short = (r: RoomCategory) => (r.rentPerDay > 0 ? `${money(r.rentPerDay)} அறை` : r.label);
  const copy: Copy = {
    room,
    needEstimate: {
      text: 'மருத்துவமனை எஸ்டிமேட்டின் புகைப்படத்தை அனுப்புங்கள், அறைக் கட்டணங்களைச் சரிபார்க்கிறேன்.',
      say: 'மருத்துவமனை எஸ்டிமேட்டைக் காட்டுங்கள். அதன் புகைப்படம் எடுங்கள், அறைக் கட்டணங்களைச் சரிபார்க்கிறேன்.',
    },
    unclear: {
      title: 'முதலில் எஸ்டிமேட்டைச் சரிபாருங்கள்',
      intro: 'எஸ்டிமேட்டில் சில எண்களைப் படிக்க முடியவில்லை அல்லது கூட்டுத்தொகை பொருந்தவில்லை:',
      outro:
        'தெளிவான புகைப்படம் எடுங்கள், அல்லது இந்த எண்களை டெஸ்க்கில் சரிபாருங்கள். அவை சரியாகும் வரை தொகை சொல்ல மாட்டேன்.',
      say: 'எஸ்டிமேட்டில் சில எண்கள் தெளிவாக இல்லை, அல்லது கூட்டுத்தொகை பொருந்தவில்லை. தெளிவான புகைப்படம் எடுங்கள், அல்லது டெஸ்க்கில் சரிபாருங்கள்.',
    },
    noCover: {
      title: (name) => `${name}-க்கு ஹெல்த் கவர் எதுவும் இல்லை`,
      body: (name, date) =>
        `${date} அன்று குடும்பத்தின் எந்த ஹெல்த் பாலிசியும் ${name}-ஐக் கவர் செய்யவில்லை. சிகிச்சை முதலில். மருத்துவமனையிடம் செலவைக் கேளுங்கள், மற்றும் ${safetyNet}.`,
      say: (name) =>
        `${name}-ஐ இன்று கவர் செய்யும் ஹெல்த் பாலிசி எதையும் என்னால் காண முடியவில்லை. சிகிச்சை முதலில். மருத்துவமனையிடம் செலவைக் கேளுங்கள், மற்றும் ${safetyNet}.`,
    },
    order: {
      title: 'முதலில் இந்தக் கார்டைக் கொடுங்கள்',
      pays: (name) => `${name} சுமார் கொடுக்கும்`,
    },
    compare: {
      title: 'எந்த அறை',
      cut: (rent) =>
        `${money(rent)} அறையில் டாக்டர் மற்றும் ஆபரேஷன் கட்டணங்களும் அதிகம், இன்ஷூரன்ஸ் அவற்றில் ஒரு பகுதியைக் குறைக்கும்.`,
      plain: 'ஒவ்வொரு அறையிலும் நீங்கள் செலுத்த வேண்டியது.',
      youPay: (r) => `${room(r)}: நீங்கள் சுமார்`,
      saving: 'நீங்கள் சேமிப்பது சுமார்',
    },
    ask: {
      title: 'டெஸ்க்கில் கேளுங்கள்',
      getRoom: (r) => `${short(r)} கிடைக்குமா?`,
      cashless: (policy) =>
        country === 'SG'
          ? `${policy} மூலம் ப்ரீ-ஆதரைசேஷனைத் தொடங்குங்கள்.`
          : `${policy} மூலம் கேஷ்லெஸ் அப்ரூவலைத் தொடங்குங்கள்.`,
      confirm: `கையெழுத்திடும் முன் ${desk}-இல் தொகைகளை உறுதிப்படுத்துங்கள்.`,
    },
    branch: {
      title: 'எல்லா அறைகளிலும் ஒரே கட்டணம் என்றால்',
      body: 'அப்போது இன்ஷூரன்ஸ் டாக்டர் மற்றும் ஆபரேஷன் கட்டணங்களைக் குறைக்க முடியாது, அறை வாடகை மட்டுமே வேறுபடும். எது என்று டெஸ்க்கில் கேளுங்கள்.',
    },
    topUp: {
      title: 'டாப்-அப் பாலிசி',
      body: (name, deductible) =>
        `${name} இந்த ஆண்டின் பில்கள் ${money(deductible)}-ஐத் தாண்டிய பின்தான் கொடுக்கும். எல்லா பில்களையும் டிஸ்சார்ஜ் சம்மரியையும் பத்திரமாக வையுங்கள்.`,
      deductible: 'இதற்கு மேல் மட்டுமே கொடுக்கும்',
    },
    cap: {
      title: 'இந்தப் பாலிசியில் மகப்பேறு வரம்பு',
      body: (policy, limit, csection, newbornDays) =>
        `${policy} சாதாரணப் பிரசவத்துக்கு அதிகபட்சம் ${money(limit)} கொடுக்கும்${csection && csection !== limit ? ` (சிசேரியனுக்கு ${money(csection)})` : ''}, அறை எதுவாக இருந்தாலும். குழந்தையின் முதல் ${newbornDays} நாட்களின் மருத்துவமனைச் செலவு இந்த வரம்புக்குள்ளேயே கணக்கிடப்படும், கூடுதலாக அல்ல.`,
      next: 'அடுத்த முறைக்கு: மகப்பேறு கவர் உள்ள ரீடெய்ல் ஹெல்த் பாலிசிகள் உள்ளன, ஆனால் ஒவ்வொன்றிலும் ஒரு வருடம் அல்லது அதற்கு மேல் காத்திருப்புக் காலம் உண்டு, எனவே கர்ப்பத்துக்கு முன்பே வாங்கினால் மட்டுமே உதவும். பிறந்த 90 நாட்களுக்குள் குழந்தையைப் பாலிசியில் சேருங்கள்.',
      limit: 'பாலிசி அதிகபட்சம் கொடுக்கும்',
      above: 'வரம்புக்கு மேல் (நீங்கள் செலுத்த வேண்டியது)',
    },
    noMaternity: {
      title: 'இந்தப் பாலிசியில் மகப்பேறு கவர் இல்லை',
      body: (policy) =>
        `${policy} பிரசவத்தைக் கவர் செய்யாது, எனவே மருத்துவமனை பில்லை நீங்கள் செலுத்த வேண்டும். பாலிசி ஷெட்யூலில் உள்ள விலக்குகளைப் பாருங்கள், கையெழுத்திடும் முன் ${desk}-இல் உறுதிப்படுத்துங்கள்.`,
    },
    waiting: {
      title: 'மகப்பேறு காத்திருப்புக் காலம் இன்னும் முடியவில்லை',
      body: (policy, until) =>
        `${policy} ${longDate(until, 'ta', country)} முதல்தான் பிரசவத்தைக் கவர் செய்யும், எனவே இந்த மருத்துவமனை பில்லை நீங்கள் செலுத்த வேண்டும். கையெழுத்திடும் முன் ${desk}-இல் தேதியை உறுதிப்படுத்துங்கள்.`,
    },
    sameCharges: (lower, quoted) =>
      `${room(lower)} அறையில் சர்ஜன், OT, நர்சிங் மற்றும் டாக்டர் கட்டணங்கள் ${room(quoted)} அறையை விட வேறா, அல்லது எல்லா அறைகளுக்கும் ஒன்றா?`,
    packagePrice: (procedure, lower) =>
      `${room(lower)} அறையில் ${procedure}-க்கான பேக்கேஜ் விலை என்ன?`,
    text: {
      switchRoom: (rec, recPays, worst, worstPays, saving) =>
        `${short(rec)}யைக் கேளுங்கள்: ${short(worst)}யில் சுமார் ${money(worstPays)}-க்குப் பதிலாக சுமார் ${money(recPays)} செலுத்துவீர்கள் (${money(saving)} குறைவு).`,
      youPay: (amount) => `நீங்கள் சுமார் ${money(amount)} செலுத்த வேண்டும்.`,
      firstCard: (policy) => `முதலில் ${policy} கார்டை ${desk}-இல் கொடுங்கள்.`,
      ifFlat: (saving) =>
        `எல்லா அறைகளிலும் ஒரே கட்டணம் என்றால், வித்தியாசம் ${money(saving)} மட்டுமே; டெஸ்க்கில் கேளுங்கள்.`,
      capped: (limit) =>
        `இந்தப் பாலிசி பிரசவத்துக்கு அதிகபட்சம் ${money(limit)} மட்டுமே கொடுக்கும், அறை எதுவாக இருந்தாலும்.`,
      roomPick: (r, pays, best, bestPays) =>
        r.id === best.id
          ? `${room(r)} உங்களுக்கு மிகவும் மலிவு: சுமார் ${money(pays)}.`
          : `${r.label} (${money(r.rentPerDay)}/நாள்): நீங்கள் சுமார் ${money(pays)} செலுத்த வேண்டும், அதாவது ${best.label} (${money(bestPays)})-ஐ விட ${money(pays - bestPays)} அதிகம்.`,
      eachRoom: (items) =>
        `ஒவ்வொரு அறையிலும் நீங்கள் செலுத்த வேண்டியது: ${items.map((i) => `${i.room.label} ${money(i.pays)}`).join(' · ')}.`,
      hospitalRules:
        'உதவியாளர், பார்வையாளர் அல்லது உணவு பற்றிய விதிகள் மருத்துவமனையுடையவை, பாலிசியுடையவை அல்ல; இந்த அறைகளில் எதுவும் உங்கள் கவருடன் பொருந்தும், நீங்கள் செலுத்தும் தொகை மட்டுமே மாறும்.',
    },
  };
  return copy;
};

// --------------------------------------------------------------------------------------- Mandarin

const zh: Factory = (money, country) => {
  const desk = country === 'SG' ? '医院商务办公室' : 'TPA 柜台';
  const safetyNet =
    country === 'SG'
      ? '向医务社工询问 MediFund 医疗基金'
      : '查看是否符合 Ayushman Bharat (PM-JAY) 的资格';
  const room = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `${r.label}（${money(r.rentPerDay)}/天）` : r.label;
  const short = (r: RoomCategory) => (r.rentPerDay > 0 ? `${money(r.rentPerDay)}的病房` : r.label);
  const copy: Copy = {
    room,
    needEstimate: {
      text: '请发一张医院费用预估单的照片，我来核对病房收费。',
      say: '请给我看医院的费用预估单。拍一张照片，我来核对病房收费。',
    },
    unclear: {
      title: '请先核对预估单',
      intro: '预估单上有些数字无法读取，或者加起来对不上：',
      outro: '请拍一张更清晰的照片，或向柜台核对这些数字。数字正确之前，我不会给出金额。',
      say: '预估单上有些数字不清楚，或者加起来对不上。请拍一张更清晰的照片，或向柜台核对。',
    },
    noCover: {
      title: (name) => `没有找到${name}的医疗保障`,
      body: (name, date) =>
        `在${date}，家里没有任何医疗保单承保${name}。先治疗要紧。向医院询问费用，并${safetyNet}。`,
      say: (name) =>
        `我没有找到今天承保${name}的医疗保单。先治疗要紧。向医院询问费用，并${safetyNet}。`,
    },
    order: { title: '先出示这张卡', pays: (name) => `${name}大约赔付` },
    compare: {
      title: '选哪种病房',
      cut: (rent) => `${money(rent)}的病房里，医生费和手术费也更高，保险会扣减其中一部分。`,
      plain: '每种病房您需要自付的金额。',
      youPay: (r) => `${room(r)}：您大约自付`,
      saving: '您大约节省',
    },
    ask: {
      title: '向柜台询问',
      getRoom: (r) => `可以安排${short(r)}吗？`,
      cashless: (policy) =>
        country === 'SG' ? `请用${policy}开始预授权。` : `请用${policy}开始无现金审批。`,
      confirm: `签字前请向${desk}确认金额。`,
    },
    branch: {
      title: '如果每种病房的收费都一样',
      body: '那么保险就不能扣减医生费和手术费，只有病房费不同。请问柜台是哪一种情况。',
    },
    topUp: {
      title: '附加保单',
      body: (name, deductible) =>
        `${name}只有在今年的账单超过${money(deductible)}后才会赔付。请保留每一张账单和出院小结。`,
      deductible: '仅赔付超出部分',
    },
    cap: {
      title: '这份保单的分娩限额',
      body: (policy, limit, csection, newbornDays) =>
        `无论住哪种病房，${policy}对顺产最多赔付${money(limit)}${csection && csection !== limit ? `（剖腹产${money(csection)}）` : ''}。宝宝出生后前${newbornDays}天的住院费用计入这个限额，不另外计算。`,
      next: '下一次：市面上有含分娩保障的个人医疗保单，但都有一年或更长的等待期，所以只有在怀孕前很早买才有用。请在宝宝出生后 90 天内把宝宝加入保单。',
      limit: '保单最多赔付',
      above: '超出限额（需您自付）',
    },
    noMaternity: {
      title: '这份保单不含分娩保障',
      body: (policy) =>
        `${policy}不承保分娩，所以医院账单需要您自付。请查看保单附表中的除外责任，并在签字前向${desk}确认。`,
    },
    waiting: {
      title: '分娩等待期尚未结束',
      body: (policy, until) =>
        `${policy}从${longDate(until, 'zh', country)}起才承保分娩，所以这张医院账单需要您自付。签字前请向${desk}确认日期。`,
    },
    sameCharges: (lower, quoted) =>
      `${room(lower)}的外科医生、手术室、护理和医生费用，和${room(quoted)}一样，还是每种病房都不同？`,
    packagePrice: (procedure, lower) => `${room(lower)}的${procedure}配套价是多少？`,
    text: {
      switchRoom: (rec, recPays, worst, worstPays, saving) =>
        `请要求${short(rec)}：您大约自付${money(recPays)}，而不是${short(worst)}的大约${money(worstPays)}（少付${money(saving)}）。`,
      youPay: (amount) => `您大约自付${money(amount)}。`,
      firstCard: (policy) => `先把${policy}的卡交给${desk}。`,
      ifFlat: (saving) => `如果每种病房的收费都一样，差别只有${money(saving)}；请问柜台。`,
      capped: (limit) => `无论住哪种病房，这份保单对分娩最多赔付${money(limit)}。`,
      roomPick: (r, pays, best, bestPays) =>
        r.id === best.id
          ? `${room(r)}对您最便宜：大约${money(pays)}。`
          : `${r.label}（${money(r.rentPerDay)}/天）：您大约自付${money(pays)}，比${best.label}（${money(bestPays)}）多${money(pays - bestPays)}。`,
      eachRoom: (items) =>
        `每种病房您需要自付：${items.map((i) => `${i.room.label} ${money(i.pays)}`).join(' · ')}。`,
      hospitalRules:
        '陪护、探视或饮食的规定由医院决定，与保单无关；这些病房都在您的保障范围内，只是自付金额不同。',
    },
  };
  return copy;
};

// ------------------------------------------------------------------------------------------ Malay

const ms: Factory = (money, country) => {
  const desk = country === 'SG' ? 'pejabat perniagaan hospital' : 'kaunter TPA';
  const safetyNet =
    country === 'SG'
      ? 'tanya pekerja sosial perubatan tentang MediFund'
      : 'semak sama ada mereka layak untuk Ayushman Bharat (PM-JAY)';
  const room = (r: RoomCategory) =>
    r.rentPerDay > 0 ? `${r.label} (${money(r.rentPerDay)}/hari)` : r.label;
  const short = (r: RoomCategory) => (r.rentPerDay > 0 ? `bilik ${money(r.rentPerDay)}` : r.label);
  const copy: Copy = {
    room,
    needEstimate: {
      text: 'Sila hantar gambar anggaran hospital, supaya saya boleh semak caj bilik.',
      say: 'Sila tunjukkan anggaran hospital. Ambil gambarnya, dan saya akan semak caj bilik.',
    },
    unclear: {
      title: 'Semak anggaran dahulu',
      intro: 'Beberapa angka pada anggaran tidak dapat dibaca atau jumlahnya tidak sepadan:',
      outro:
        'Sila ambil gambar yang lebih jelas, atau semak angka ini dengan kaunter. Saya tidak akan beri jumlah sehingga ia betul.',
      say: 'Beberapa angka pada anggaran tidak jelas, atau jumlahnya tidak sepadan. Sila ambil gambar yang lebih jelas, atau semak dengan kaunter.',
    },
    noCover: {
      title: (name) => `Tiada perlindungan kesihatan ditemui untuk ${name}`,
      body: (name, date) =>
        `Tiada polisi kesihatan keluarga yang melindungi ${name} pada ${date}. Rawatan didahulukan. Tanya hospital tentang kos, dan ${safetyNet}.`,
      say: (name) =>
        `Saya tidak menemui polisi kesihatan yang melindungi ${name} hari ini. Rawatan didahulukan. Tanya hospital tentang kos, dan ${safetyNet}.`,
    },
    order: { title: 'Serahkan kad ini dahulu', pays: (name) => `${name} membayar kira-kira` },
    compare: {
      title: 'Bilik yang mana',
      cut: (rent) =>
        `Di bilik ${money(rent)}, caj doktor dan pembedahan juga lebih tinggi, dan insurans memotong sebahagiannya.`,
      plain: 'Apa yang anda bayar di setiap bilik.',
      youPay: (r) => `${room(r)}: anda bayar kira-kira`,
      saving: 'Anda jimat kira-kira',
    },
    ask: {
      title: 'Tanya kaunter',
      getRoom: (r) => `Boleh kami dapat ${short(r)}?`,
      cashless: (policy) =>
        country === 'SG'
          ? `Sila mulakan pra-kelulusan dengan ${policy}.`
          : `Sila mulakan kelulusan tanpa tunai dengan ${policy}.`,
      confirm: `Sahkan jumlah dengan ${desk} sebelum anda menandatangani.`,
    },
    branch: {
      title: 'Jika setiap bilik dikenakan caj yang sama',
      body: 'Maka insurans tidak boleh memotong caj doktor dan pembedahan, dan hanya sewa bilik yang berbeza. Tanya kaunter yang mana satu.',
    },
    topUp: {
      title: 'Polisi tambahan',
      body: (name, deductible) =>
        `${name} hanya membayar selepas bil tahun ini melebihi ${money(deductible)}. Simpan setiap bil dan ringkasan discaj.`,
      deductible: 'Hanya bayar melebihi',
    },
    cap: {
      title: 'Had bersalin dalam polisi ini',
      body: (policy, limit, csection, newbornDays) =>
        `${policy} membayar paling banyak ${money(limit)} untuk kelahiran normal${csection && csection !== limit ? ` (${money(csection)} untuk pembedahan caesarean)` : ''}, apa pun biliknya. Perbelanjaan hospital bayi dalam ${newbornDays} hari pertama dikira dalam had ini, bukan tambahan.`,
      next: 'Untuk kali seterusnya: ada pelan kesihatan runcit dengan perlindungan bersalin, tetapi setiap satu ada tempoh menunggu setahun atau lebih, jadi ia hanya membantu jika dibeli jauh sebelum kehamilan. Tambah bayi ke polisi anda dalam masa 90 hari selepas lahir.',
      limit: 'Polisi membayar paling banyak',
      above: 'Melebihi had (anda perlu bayar)',
    },
    noMaternity: {
      title: 'Tiada perlindungan bersalin dalam polisi ini',
      body: (policy) =>
        `${policy} tidak melindungi bersalin, jadi bil hospital perlu anda bayar. Semak pengecualian dalam jadual polisi, dan minta ${desk} mengesahkan sebelum anda menandatangani.`,
    },
    waiting: {
      title: 'Tempoh menunggu bersalin belum tamat',
      body: (policy, until) =>
        `${policy} hanya melindungi bersalin mulai ${longDate(until, 'ms', country)}, jadi bil hospital ini perlu anda bayar. Minta ${desk} mengesahkan tarikh sebelum anda menandatangani.`,
    },
    sameCharges: (lower, quoted) =>
      `Adakah caj pakar bedah, OT, kejururawatan dan doktor di bilik ${room(lower)} berbeza daripada bilik ${room(quoted)}, atau sama untuk setiap bilik?`,
    packagePrice: (procedure, lower) =>
      `Berapakah harga pakej untuk ${procedure} di bilik ${room(lower)}?`,
    text: {
      switchRoom: (rec, recPays, worst, worstPays, saving) =>
        `Minta ${short(rec)}: anda bayar kira-kira ${money(recPays)} dan bukan kira-kira ${money(worstPays)} di ${short(worst)} (${money(saving)} kurang).`,
      youPay: (amount) => `Anda bayar kira-kira ${money(amount)}.`,
      firstCard: (policy) => `Serahkan kad ${policy} di ${desk} dahulu.`,
      ifFlat: (saving) =>
        `Jika setiap bilik dikenakan caj yang sama, bezanya hanya ${money(saving)}; tanya kaunter.`,
      capped: (limit) =>
        `Polisi ini membayar paling banyak ${money(limit)} untuk bersalin, apa pun biliknya.`,
      roomPick: (r, pays, best, bestPays) =>
        r.id === best.id
          ? `${room(r)} paling murah untuk anda: kira-kira ${money(pays)}.`
          : `${r.label} (${money(r.rentPerDay)}/hari): anda bayar kira-kira ${money(pays)}, iaitu ${money(pays - bestPays)} lebih daripada ${best.label} (${money(bestPays)}).`,
      eachRoom: (items) =>
        `Apa yang anda bayar di setiap bilik: ${items.map((i) => `${i.room.label} ${money(i.pays)}`).join(' · ')}.`,
      hospitalRules:
        'Peraturan tentang penjaga, pelawat atau makanan ditetapkan oleh hospital, bukan polisi; mana-mana bilik ini sesuai dengan perlindungan anda, hanya jumlah yang anda bayar berubah.',
    },
  };
  return copy;
};

const FACTORIES: Record<Locale, Factory> = { en, hi, ta, zh, ms };

/** The desk copy for one language and market. */
export function copyFor(locale: Locale, country: Country = 'IN'): Copy {
  return FACTORIES[locale]((n) => formatMoney(n, country), country);
}
