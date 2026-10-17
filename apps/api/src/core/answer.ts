import { buildDeskSay, evaluateHospital } from '@kavach/engine';
import type {
  BillingType,
  BranchResult,
  DeskAnswer,
  DeskCard,
  DeskEvaluation,
  DeskInputs,
  HospitalEstimate,
  Household,
  Locale,
  Policy,
  RoomCategory,
  RoomOptionResult,
} from '@kavach/schemas';
import { deskPatient, policyName, policyNickname, type DeskPatient } from './context';
import { COPY, type Copy } from './copy';
import { detectBillingAnswer, detectLocale, detectRoomMention } from './intent';

/**
 * The desk core. Every door (text-and-photo desk, live session, WhatsApp) calls this one
 * function; nothing outside packages/engine computes a rupee amount.
 */
export function answer(
  household: Household,
  patientId: string,
  inputs: DeskInputs,
  locale: Locale,
): DeskAnswer {
  const lang = detectLocale(inputs.utteranceText, locale);
  const t = COPY[lang];
  const patient = deskPatient(household, patientId);
  const { estimate } = inputs;

  if (patient.policies.length === 0) return noCover(patient, t, lang);
  if (!estimate) return { ...t.needEstimate, cards: [], trace: [], locale: lang };
  if (estimate.needsConfirmation) return unclearEstimate(estimate, t, lang);

  // A typed or spoken "same in every room" answers the desk question only while it is open.
  const billingTypeAnswer =
    inputs.billingTypeAnswer ??
    (estimate.billingType === 'unknown' ? detectBillingAnswer(inputs.utteranceText) : undefined);
  const evaluation = evaluateDesk(patient, estimate, {
    billingTypeAnswer,
    roomOptions: inputs.roomOptions,
  });
  return explain(
    household,
    patient,
    estimate,
    evaluation,
    t,
    lang,
    inputs.followUp ? inputs.utteranceText : undefined,
  );
}

/** The engine result for a patient and estimate, with the family's billing answer applied. */
export function evaluateDesk(
  patient: DeskPatient,
  estimate: HospitalEstimate,
  opts: { billingTypeAnswer?: BillingType; roomOptions?: RoomCategory[] } = {},
): DeskEvaluation {
  if (patient.policies.length === 0) {
    throw Object.assign(new Error('No health policy covers this patient'), { statusCode: 422 });
  }
  const billingType =
    opts.billingTypeAnswer && opts.billingTypeAnswer !== 'unknown'
      ? opts.billingTypeAnswer
      : estimate.billingType;
  return evaluateHospital(patient.engine, { ...estimate, billingType }, opts.roomOptions);
}

function explain(
  household: Household,
  patient: DeskPatient,
  estimate: HospitalEstimate,
  ev: DeskEvaluation,
  t: Copy,
  lang: Locale,
  /** What the family typed or said this turn, when the session already had an answer. */
  utterance?: string,
): DeskAnswer {
  const byId = new Map(patient.policies.map((p) => [p.id, p]));
  const order = ev.policyOrder.map((id) => byId.get(id)!);
  const nick = (p: Policy) => policyNickname(p, household, lang);
  const spoken = Object.fromEntries(
    order.map((p) => [p.id, policyNickname(p, household, lang === 'hi' ? 'hiSpeech' : 'en')]),
  );

  const { primary, alternate } = ev;
  const rec = recommended(primary);
  const worst = mostExpensive(primary);
  const quoted = estimate.roomCategories[0]!;
  const question = localQuestion(ev, estimate, patient.policies, t);

  const cards: DeskCard[] = [
    {
      id: 'policy_order',
      kind: 'policy_order',
      title: t.order.title,
      body: order.map((p, i) => `${i + 1}. ${nick(p)}: ${policyName(p)}`).join('\n'),
      amounts: rec.policyShares
        .filter((s) => s.pays > 0)
        .map((s) => ({
          label: t.order.pays(nick(byId.get(s.policyId)!)),
          amount: s.pays,
          emphasis: false,
        })),
      ruleIds: ['R-HL-006'],
      verified: true,
    },
    roomCompare(primary, rec, worst, t),
    {
      id: 'ask_desk',
      kind: 'ask_desk',
      title: t.ask.title,
      body: [
        question,
        rec.roomCategoryId !== quoted.id ? t.ask.getRoom(asRoom(rec)) : undefined,
        t.ask.cashless(nick(order[0]!)),
        t.ask.confirm,
      ]
        .filter(Boolean)
        .join('\n'),
      amounts: [],
      ruleIds: question ? [primary.billingType === 'package' ? 'R-HL-014' : 'R-HL-010'] : [],
      verified: true,
    },
  ];

  // MX-1: a maternity limit that binds in the recommended room gets its own card (R-MT-001).
  const capFiring = ev.trace.find(
    (f) =>
      f.ruleId === 'R-MT-001' &&
      f.inputs.roomCategoryId === rec.roomCategoryId &&
      f.output.capped === true &&
      typeof f.inputs.limit === 'number' &&
      f.inputs.limit > 0,
  );
  const capPolicy = capFiring && byId.get(String(capFiring.inputs.policyId));
  if (capFiring && capPolicy?.terms.maternity) {
    const m = capPolicy.terms.maternity;
    const limit = Number(capFiring.inputs.limit);
    cards.splice(2, 0, {
      id: 'limit_cap',
      kind: 'limit_cap',
      title: t.cap.title,
      body: `${t.cap.body(nick(capPolicy), m.limitNormal, m.limitCsection, m.newbornDays)}\n${t.cap.next}`,
      amounts: [
        { label: t.cap.limit, amount: limit, emphasis: false },
        { label: t.cap.above, amount: Number(capFiring.output.aboveLimit ?? 0), emphasis: true },
      ],
      ruleIds: ['R-MT-001', 'R-MT-003'],
      verified: true,
    });
  }

  if (alternate) {
    cards.push({
      id: 'billing_branch',
      kind: 'billing_branch',
      title: t.branch.title,
      body: t.branch.body,
      amounts: compareAmounts(alternate, t),
      ruleIds: ['R-HL-010'],
      verified: true,
    });
  }

  // A top-up that pays nothing in the recommended room gets one note (R-HL-009).
  for (const f of ev.trace) {
    const policy = byId.get(String(f.inputs.policyId));
    if (
      f.ruleId !== 'R-HL-009' ||
      f.inputs.roomCategoryId !== rec.roomCategoryId ||
      f.output.pays !== 0 ||
      policy?.kind !== 'super_top_up' ||
      cards.some((c) => c.id === `top_up_${policy.id}`)
    )
      continue;
    const deductible = Number(f.inputs.deductible);
    cards.push({
      id: `top_up_${policy.id}`,
      kind: 'top_up_note',
      title: t.topUp.title,
      body: t.topUp.body(nick(policy), deductible),
      amounts: [{ label: t.topUp.deductible, amount: deductible, emphasis: false }],
      ruleIds: ['R-HL-009'],
      verified: true,
    });
  }

  // A follow-up question ("can we take the twin sharing?", "general ward allows one attendant,
  // which room then?") gets the per-room figures, not the opening paragraph again. Numbers
  // still come only from the engine result; the question itself is not interpreted beyond
  // which room it names.
  const rooms = primary.options.map((o) => asRoom(o));
  const named = utterance ? detectRoomMention(utterance, rooms) : undefined;
  const isFollowUp = Boolean(utterance?.trim()) && !billingAnswerIn(utterance);
  const byRoom = (id: string) => primary.options.find((o) => o.roomCategoryId === id)!;
  const text = isFollowUp
    ? [
        named
          ? t.text.roomPick(named, byRoom(named.id).outOfPocket, asRoom(rec), rec.outOfPocket)
          : undefined,
        t.text.eachRoom(
          [...primary.options]
            .sort((a, b) => a.outOfPocket - b.outOfPocket)
            .map((o) => ({ room: asRoom(o), pays: o.outOfPocket })),
        ),
        capFiring ? t.text.capped(Number(capFiring.inputs.limit)) : undefined,
        t.text.hospitalRules,
      ]
        .filter(Boolean)
        .join(' ')
    : [
        primary.saving > 0 && worst.roomCategoryId !== rec.roomCategoryId
          ? t.text.switchRoom(
              asRoom(rec),
              rec.outOfPocket,
              asRoom(worst),
              worst.outOfPocket,
              primary.saving,
            )
          : t.text.youPay(rec.outOfPocket),
        t.text.firstCard(nick(order[0]!)),
        capFiring ? t.text.capped(Number(capFiring.inputs.limit)) : undefined,
        alternate ? t.text.ifFlat(alternate.saving) : undefined,
      ]
        .filter(Boolean)
        .join(' ');

  return {
    text,
    say: buildDeskSay(ev, lang, { policyNames: spoken }),
    cards,
    questionForDesk: question,
    trace: ev.trace,
    locale: lang,
  };
}

function roomCompare(
  branch: BranchResult,
  rec: RoomOptionResult,
  worst: RoomOptionResult,
  t: Copy,
): DeskCard {
  const cut = worst.deductions.some((d) => d.ruleId === 'R-HL-001');
  const ruleIds = new Set(branch.options.flatMap((o) => o.deductions.map((d) => d.ruleId)));
  if (branch.options.some((o) => o.copay > 0)) ruleIds.add('R-HL-003');
  return {
    id: 'room_compare',
    kind: 'room_compare',
    title: t.compare.title,
    body: cut && worst !== rec ? t.compare.cut(worst.rentPerDay) : t.compare.plain,
    amounts: compareAmounts(branch, t),
    ruleIds: [...ruleIds],
    verified: true,
  };
}

/** Out-of-pocket per room, priciest room first, then the saving. */
function compareAmounts(branch: BranchResult, t: Copy): DeskCard['amounts'] {
  const options = [...branch.options].sort((a, b) => b.rentPerDay - a.rentPerDay);
  const amounts = options.map((o) => ({
    label: t.compare.youPay(asRoom(o)),
    amount: o.outOfPocket,
    emphasis: o.roomCategoryId === branch.recommendedRoomCategoryId && options.length > 1,
  }));
  if (branch.saving > 0)
    amounts.push({ label: t.compare.saving, amount: branch.saving, emphasis: true });
  return amounts;
}

/** The engine's desk question, in the answer's language. */
function localQuestion(
  ev: DeskEvaluation,
  estimate: HospitalEstimate,
  policies: Policy[],
  t: Copy,
): string | undefined {
  if (!ev.questionForDesk) return undefined;
  const quoted = estimate.roomCategories[0]!;
  const lower = lowerRoom(estimate.roomCategories, policies);
  return ev.primary.billingType === 'package'
    ? t.packagePrice(estimate.procedure, lower)
    : t.sameCharges(lower, quoted);
}

/** Same choice as the engine's question: the best room within the tightest room-rent limit. */
function lowerRoom(rooms: RoomCategory[], policies: Policy[]): RoomCategory {
  const limits = policies.map((p) => p.terms.roomRentLimitPerDay).filter((l) => l !== undefined);
  const limit = limits.length ? Math.min(...limits) : Infinity;
  const byRent = [...rooms].sort((a, b) => a.rentPerDay - b.rentPerDay);
  return [...byRent].reverse().find((r) => r.rentPerDay <= limit) ?? byRent[0]!;
}

function noCover(patient: DeskPatient, t: Copy, lang: Locale): DeskAnswer {
  const name = patient.member.name;
  const body = t.noCover.body(name, patient.asOf);
  return {
    text: body,
    say: t.noCover.say(name),
    cards: [warning('no_cover', t.noCover.title(name), body)],
    trace: [],
    locale: lang,
  };
}

function unclearEstimate(estimate: HospitalEstimate, t: Copy, lang: Locale): DeskAnswer {
  const body = [t.unclear.intro, ...estimate.notes.map((n) => `• ${n}`), t.unclear.outro].join(
    '\n',
  );
  return {
    text: `${t.unclear.intro.replace(/:$/, '.')} ${t.unclear.outro}`,
    say: t.unclear.say,
    cards: [warning('estimate_unclear', t.unclear.title, body)],
    trace: [],
    locale: lang,
  };
}

/** True when the utterance was the family's answer to the desk's billing question. */
const billingAnswerIn = (utterance: string | undefined) =>
  detectBillingAnswer(utterance) !== undefined;

const warning = (id: string, title: string, body: string): DeskCard => ({
  id,
  kind: 'warning',
  title,
  body,
  amounts: [],
  ruleIds: [],
  verified: true,
});

const asRoom = (o: RoomOptionResult): RoomCategory => ({
  id: o.roomCategoryId,
  label: o.label,
  rentPerDay: o.rentPerDay,
});

const recommended = (b: BranchResult) =>
  b.options.find((o) => o.roomCategoryId === b.recommendedRoomCategoryId)!;

const mostExpensive = (b: BranchResult) =>
  b.options.reduce((a, o) => (o.outOfPocket > a.outOfPocket ? o : a));
