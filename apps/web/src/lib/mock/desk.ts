/**
 * Mock desk data: the Sharma family and the HX-1 hero scene (City Heart Hospital,
 * planned angioplasty, 4 days), shaped exactly like @kavach/schemas.
 *
 * Every rupee here is copied from the engine's worked example in
 * docs/research/red-team-response.md §3. It stands in for the API until the desk
 * core (WP-3) lands; then `lib/desk-client.ts` switches to the real API.
 */
import {
  DeskAnswer,
  DeskEvaluation,
  DeskSession,
  HospitalEstimate,
  Member,
  type Locale,
  type RoomOptionResult,
} from '@kavach/schemas';
import type { DeskClient, DeskHousehold, DeskSessionSummary } from '../desk-client';

const HOUSEHOLD_ID = 'hh_sharma_demo';
const HOSPITAL = 'City Heart Hospital';
const PARENTS_POLICY = 'pol_parents_migrated';
const TOP_UP = 'pol_supertopup';

const members = [
  { id: 'm_suresh', name: 'Suresh Sharma', relation: 'parent', age: 62, language: 'hi' },
  { id: 'm_kamala', name: 'Kamala Sharma', relation: 'parent', age: 58, language: 'hi' },
  { id: 'm_rahul', name: 'Rahul Sharma', relation: 'self', age: 34, language: 'en' },
  { id: 'm_priya', name: 'Priya Sharma', relation: 'spouse', age: 32, language: 'en' },
  { id: 'm_anaya', name: 'Anaya Sharma', relation: 'child', age: 5, language: 'en' },
].map((m) => Member.parse(m));

/** The printed estimate with the hospital's room-category tariff (HX-1). */
const estimate = HospitalEstimate.parse({
  hospitalName: HOSPITAL,
  patientName: 'Suresh Sharma',
  procedure: 'Coronary angioplasty (planned)',
  admissionType: 'planned',
  days: 4,
  billingType: 'differential',
  roomCategories: [
    { id: 'deluxe', label: 'Deluxe Single', rentPerDay: 9000 },
    { id: 'standard', label: 'Single Standard', rentPerDay: 5000 },
  ],
  lines: [
    ['room', 'Room rent × 4 days', true, 36000, 20000],
    ['nursing', 'Nursing & RMO × 4', true, 8000, 6000],
    ['surgeon', 'Surgeon / procedure', true, 120000, 90000],
    ['ot', 'Cath lab / OT', true, 40000, 26000],
    ['doctor_visits', 'Doctor visits', true, 12000, 8000],
    ['implant', 'Stent (implant)', false, 45000, 45000],
    ['pharmacy', 'Pharmacy & consumables', false, 55000, 55000],
    ['diagnostics', 'Diagnostics', false, 24000, 24000],
    ['non_payable', 'Non-payable items', false, 6000, 6000],
  ].map(([head, label, pricedByRoom, deluxe, standard]) => ({
    head,
    label,
    pricedByRoom,
    amounts: { deluxe, standard },
  })),
});

/** Strings the engine and desk core would produce, per language. */
const copy = {
  en: {
    roomExcess: 'Room rent above ₹5,000 a day',
    proportionate: 'Cut in proportion on charges priced by room',
    nonPayable: 'Non-payable items',
    needEstimate:
      'Please take a photo of the hospital estimate first, so I can check the room charges.',
    text: 'Ask for the ₹5,000 room: you pay about ₹60,800 instead of about ₹1,50,800. Give the parents’ policy card at the TPA desk first.',
    say: 'Give the parents’ policy card at the TPA desk first. In the ₹9,000 room the doctor and operation charges are higher too, and the insurer will cut them. You would pay about ₹1,50,800. Ask for the ₹5,000 room, then about ₹60,800. The top-up policy helps only when this year’s bills cross ₹5 lakh, so keep every bill. Confirm with the TPA desk before you sign.',
    question: 'Can we get the ₹5,000 Single Standard room?',
    cards: {
      order: [
        'Give this card first',
        'Parents’ health policy (Sample Insurer A) at the TPA desk.\nThe super top-up pays only after this year’s bills cross ₹5 lakh, so keep every bill and the discharge summary.',
      ],
      room: [
        'Which room',
        'In the ₹9,000 room the doctor, operation and nursing charges are higher too, and the insurer cuts them in proportion.',
      ],
      roomA: '₹9,000 Deluxe room: you pay about',
      roomB: '₹5,000 Single Standard room: you pay about',
      saving: 'You save about',
      ask: [
        'Ask the desk',
        'Can we get the ₹5,000 Single Standard room?\nPlease start cashless approval with the parents’ policy.',
      ],
      warn: [
        'Before you sign',
        'Confirm with the TPA desk before you sign. These are estimates; the final bill can differ.',
      ],
    },
    trace: {
      order:
        'With more than one policy, the family picks which to claim first. Claim the parents’ policy first; the balance can go to the other policy.',
      billing:
        'The estimate lists each charge by room category, so the hospital bills by room (differential billing).',
      prop: 'Only charges the hospital prices by room are cut in proportion (5,000 ÷ 9,000). Stent, pharmacy, consumables and diagnostics are never cut.',
      nonPayable: 'Items on the non-payable list are not paid.',
      copay: '20% co-pay for insured aged 61 and over, on the admitted amount.',
      topUp:
        'The super top-up pays only above its ₹5,00,000 yearly deductible. This stay stays below it.',
    },
    summary:
      'At City Heart Hospital for Suresh’s angioplasty, Kavach advised asking for the ₹5,000 Single Standard room (about ₹60,800 to pay instead of about ₹1,50,800) and giving the parents’ policy card at the TPA desk first.',
  },
  hi: {
    roomExcess: '₹5,000 प्रति दिन से ऊपर का कमरा किराया',
    proportionate: 'कमरे के हिसाब वाले चार्ज पर अनुपात में कटौती',
    nonPayable: 'बीमा में न आने वाली चीज़ें',
    needEstimate: 'पहले अस्पताल के एस्टिमेट की फ़ोटो लीजिए, ताकि मैं कमरे के चार्ज देख सकूँ।',
    text: '₹5,000 वाला कमरा माँगिए: लगभग ₹60,800 देने होंगे, ₹9,000 वाले में लगभग ₹1,50,800। TPA डेस्क पर पहले पेरेंट्स वाली पॉलिसी का कार्ड दीजिए।',
    say: 'पहले पेरेंट्स वाली पॉलिसी का कार्ड TPA डेस्क पर दीजिए। ₹9,000 वाले कमरे में डॉक्टर और ऑपरेशन के चार्ज भी ज़्यादा हैं, और बीमा उन पर कटौती करेगा। आपको लगभग ₹1,50,800 देने पड़ेंगे। ₹5,000 वाला कमरा माँगिए, तब लगभग ₹60,800। टॉप-अप पॉलिसी तभी काम आएगी जब इस साल का ख़र्च ₹5 लाख से ऊपर जाए, इसलिए सारे बिल संभाल कर रखिए। साइन करने से पहले TPA डेस्क से कन्फ़र्म कर लीजिए।',
    question: 'क्या ₹5,000 वाला Single Standard कमरा मिलेगा?',
    cards: {
      order: [
        'पहले यह कार्ड दीजिए',
        'TPA डेस्क पर पेरेंट्स वाली हेल्थ पॉलिसी (Sample Insurer A)।\nसुपर टॉप-अप तभी पैसे देगी जब इस साल का ख़र्च ₹5 लाख से ऊपर जाए, इसलिए सारे बिल और डिस्चार्ज समरी संभाल कर रखिए।',
      ],
      room: [
        'कौन सा कमरा',
        '₹9,000 वाले कमरे में डॉक्टर, ऑपरेशन और नर्सिंग के चार्ज भी ज़्यादा हैं, और बीमा उन पर अनुपात में कटौती करता है।',
      ],
      roomA: '₹9,000 वाला Deluxe कमरा: आपको लगभग',
      roomB: '₹5,000 वाला Single Standard कमरा: आपको लगभग',
      saving: 'बचत लगभग',
      ask: [
        'डेस्क से पूछिए',
        'क्या ₹5,000 वाला Single Standard कमरा मिलेगा?\nपेरेंट्स वाली पॉलिसी से कैशलेस अप्रूवल शुरू कीजिए।',
      ],
      warn: [
        'साइन करने से पहले',
        'साइन करने से पहले TPA डेस्क से पक्का कर लीजिए। ये अनुमान हैं, अंतिम बिल अलग हो सकता है।',
      ],
    },
    trace: {
      order:
        'एक से ज़्यादा पॉलिसी हों तो परिवार चुनता है कि पहले किससे क्लेम करे। पहले पेरेंट्स वाली पॉलिसी; बाक़ी रक़म दूसरी पॉलिसी से।',
      billing:
        'एस्टिमेट में हर चार्ज कमरे के हिसाब से अलग लिखा है, यानी अस्पताल कमरे के हिसाब से बिल करता है।',
      prop: 'सिर्फ़ कमरे के हिसाब से बदलने वाले चार्ज पर अनुपात में कटौती होती है (5,000 ÷ 9,000)। स्टेंट, दवाइयाँ, कंज़्यूमेबल और जाँच पर कभी कटौती नहीं।',
      nonPayable: 'नॉन-पेएबल लिस्ट की चीज़ों का भुगतान नहीं होता।',
      copay: '61 साल और उससे ऊपर के बीमित पर 20% को-पे, मंज़ूर रक़म पर।',
      topUp:
        'सुपर टॉप-अप सिर्फ़ ₹5,00,000 सालाना डिडक्टिबल के ऊपर पैसे देती है। यह ख़र्च उससे कम है।',
    },
    summary:
      'सिटी हार्ट हॉस्पिटल में सुरेश जी की एंजियोप्लास्टी के लिए कवच ने ₹5,000 वाला Single Standard कमरा माँगने की सलाह दी (₹1,50,800 की जगह लगभग ₹60,800 देने होंगे) और TPA डेस्क पर पहले पेरेंट्स वाली पॉलिसी का कार्ड देने को कहा।',
  },
} as const;

const SOURCES = {
  circular: {
    title: 'IRDAI/HLT/REG/CIR/151/06/2020',
    url: 'https://www.business-standard.com/article/companies/out-of-pocket-expenses-of-policyholders-to-fall-after-new-irdai-guidelines-120061200007_1.html',
  },
  wording: { title: 'Parents’ policy wording §4.2.1 · p14 (sample)' },
  schedule: { title: 'Parents’ policy schedule · p1 (sample)' },
  topUp: { title: 'Super top-up schedule §2 · p2 (sample)' },
};

function option(
  id: 'deluxe' | 'standard',
  o: Omit<RoomOptionResult, 'roomCategoryId' | 'label' | 'rentPerDay' | 'policyShares'>,
): RoomOptionResult {
  const room = estimate.roomCategories.find((r) => r.id === id)!;
  return {
    roomCategoryId: id,
    label: room.label,
    rentPerDay: room.rentPerDay,
    ...o,
    policyShares: [
      { policyId: PARENTS_POLICY, pays: o.policyPays },
      { policyId: TOP_UP, pays: 0 },
    ],
  };
}

/** The engine result for HX-1: differential billing, plus the flat-billing branch for the Why panel. */
export function mockEvaluation(lang: Locale) {
  const c = copy[lang];
  const nonPayable = { ruleId: 'R-HL-005', label: c.nonPayable, amount: 6000 };
  return DeskEvaluation.parse({
    policyOrder: [PARENTS_POLICY, TOP_UP],
    primary: {
      billingType: 'differential',
      recommendedRoomCategoryId: 'standard',
      saving: 90000,
      options: [
        option('deluxe', {
          bill: 346000,
          admissible: 244000,
          deductions: [
            { ruleId: 'R-HL-001', label: c.roomExcess, amount: 16000 },
            { ruleId: 'R-HL-001', label: c.proportionate, amount: 80000 },
            nonPayable,
          ],
          copay: 48800,
          policyPays: 195200,
          outOfPocket: 150800,
        }),
        option('standard', {
          bill: 280000,
          admissible: 274000,
          deductions: [nonPayable],
          copay: 54800,
          policyPays: 219200,
          outOfPocket: 60800,
        }),
      ],
    },
    // If the hospital does not price by room: no cut on procedure heads, only the room excess.
    alternate: {
      billingType: 'flat',
      recommendedRoomCategoryId: 'standard',
      saving: 16000,
      options: [
        option('deluxe', {
          bill: 346000,
          admissible: 324000,
          deductions: [{ ruleId: 'R-HL-001', label: c.roomExcess, amount: 16000 }, nonPayable],
          copay: 64800,
          policyPays: 259200,
          outOfPocket: 86800,
        }),
        option('standard', {
          bill: 330000,
          admissible: 324000,
          deductions: [nonPayable],
          copay: 64800,
          policyPays: 259200,
          outOfPocket: 70800,
        }),
      ],
    },
    questionForDesk: c.question,
    trace: [
      {
        ruleId: 'R-HL-006',
        statement: c.trace.order,
        inputs: { policies: [PARENTS_POLICY, TOP_UP] },
        output: { policyOrder: [PARENTS_POLICY, TOP_UP] },
        status: 'to_verify',
        sources: [SOURCES.schedule],
      },
      {
        ruleId: 'R-HL-010',
        statement: c.trace.billing,
        inputs: { roomCategories: 2 },
        output: { billingType: 'differential' },
        status: 'verified',
        sources: [SOURCES.circular],
      },
      {
        ruleId: 'R-HL-001',
        statement: c.trace.prop,
        inputs: { roomRentLimitPerDay: 5000, rentPerDay: 9000 },
        output: { proportionateDeduction: 80000, roomExcess: 16000 },
        status: 'verified',
        sources: [SOURCES.wording, SOURCES.circular],
      },
      {
        ruleId: 'R-HL-005',
        statement: c.trace.nonPayable,
        output: { excluded: 6000 },
        status: 'verified',
        sources: [SOURCES.wording],
      },
      {
        ruleId: 'R-HL-003',
        statement: c.trace.copay,
        inputs: { copayPercent: 20, age: 62 },
        status: 'verified',
        sources: [SOURCES.schedule],
      },
      {
        ruleId: 'R-HL-009',
        statement: c.trace.topUp,
        inputs: { deductible: 500000 },
        output: { pays: 0 },
        status: 'verified',
        sources: [SOURCES.topUp],
      },
    ],
  });
}

/** The desk core's reply for HX-1 (or a request for the estimate when none was captured). */
export function mockAnswer(lang: Locale, hasEstimate = true) {
  const c = copy[lang];
  if (!hasEstimate) {
    return DeskAnswer.parse({ text: c.needEstimate, say: c.needEstimate, cards: [], trace: [] });
  }
  const ev = mockEvaluation(lang);
  const card = (
    id: string,
    kind: string,
    [title, body]: readonly [string, string],
    ruleIds: string[],
    amounts: { label: string; amount: number; emphasis?: boolean }[] = [],
  ) => ({ id, kind, title, body, ruleIds, amounts, verified: true });
  return DeskAnswer.parse({
    text: c.text,
    say: c.say,
    questionForDesk: c.question,
    trace: ev.trace,
    cards: [
      card('c_order', 'policy_order', c.cards.order, ['R-HL-006', 'R-HL-009']),
      card(
        'c_room',
        'room_compare',
        c.cards.room,
        ['R-HL-001', 'R-HL-003', 'R-HL-005'],
        [
          { label: c.cards.roomA, amount: 150800 },
          { label: c.cards.roomB, amount: 60800 },
          { label: c.cards.saving, amount: 90000, emphasis: true },
        ],
      ),
      card('c_ask', 'ask_desk', c.cards.ask, ['R-HL-010']),
      card('c_warn', 'warning', c.cards.warn, []),
    ],
  });
}

// ── Session state (kept in sessionStorage so a reload keeps the session) ──

const sessions = new Map<string, DeskSession>();

function save(session: DeskSession) {
  sessions.set(session.id, session);
  try {
    sessionStorage.setItem(`kavach.desk.${session.id}`, JSON.stringify(session));
  } catch {
    // Storage blocked: the in-memory copy still works until reload.
  }
}

function load(sessionId: string): DeskSession {
  const cached = sessions.get(sessionId);
  if (cached) return cached;
  try {
    const raw = sessionStorage.getItem(`kavach.desk.${sessionId}`);
    if (raw) return DeskSession.parse(JSON.parse(raw));
  } catch {
    // Fall through to a fresh session.
  }
  // Unknown id (e.g. a shared link): start a fresh demo session for Suresh.
  const session = DeskSession.parse({
    id: sessionId,
    householdId: HOUSEHOLD_ID,
    patientMemberId: 'm_suresh',
    language: sessionId.includes('-hi-') ? 'hi' : 'en',
    hospitalName: HOSPITAL,
    channel: 'app',
    status: 'active',
    createdAt: new Date().toISOString(),
  });
  save(session);
  return session;
}

/** Waits a little, so the UI shows its agent steps as it will with the real API. */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const mockDeskClient: DeskClient = {
  async getHousehold(): Promise<DeskHousehold> {
    return { householdId: HOUSEHOLD_ID, hospitalName: HOSPITAL, members };
  },

  async startSession({ patientMemberId, language }) {
    await delay(300);
    const id = `mock-${language}-${Math.random().toString(36).slice(2, 10)}`;
    save(
      DeskSession.parse({
        id,
        householdId: HOUSEHOLD_ID,
        patientMemberId,
        language,
        hospitalName: HOSPITAL,
        channel: 'app',
        status: 'active',
        createdAt: new Date().toISOString(),
      }),
    );
    return { sessionId: id };
  },

  async getSession(sessionId) {
    return load(sessionId);
  },

  async capture(sessionId) {
    await delay(1800);
    const session = load(sessionId);
    save({ ...session, estimate });
    return estimate;
  },

  async ask(sessionId, _text, language) {
    await delay(1500);
    const session = load(sessionId);
    const reply = mockAnswer(language, Boolean(session.estimate));
    if (reply.cards.length) save({ ...session, lastAnswer: reply });
    return reply;
  },

  async evaluate(sessionId, language) {
    load(sessionId);
    return mockEvaluation(language);
  },

  async end(sessionId): Promise<DeskSessionSummary> {
    await delay(300);
    const session = { ...load(sessionId), status: 'ended' as const };
    save(session);
    return {
      session,
      summary: session.lastAnswer
        ? { en: copy.en.summary, hi: copy.hi.summary }
        : { en: '', hi: '' },
    };
  },
};
