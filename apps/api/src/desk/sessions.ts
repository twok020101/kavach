import { randomUUID } from 'node:crypto';
import { formatMoney } from '@kavach/engine';
import type {
  HospitalEstimate,
  CreateDeskSessionBody,
  DeskAnswer,
  DeskSession,
  DeskSessionSummary,
  DeskTurnBody,
  Household,
  Locale,
  RoomCategory,
} from '@kavach/schemas';
import { readEstimate, type EstimateImage } from '../agents/estimate-reader';
import { answer, evaluateDesk } from '../core/answer';
import { deskContext, deskPatient, policyNickname } from '../core/context';
import { alertHouseholdOwner } from '../channels/whatsapp/notify';
import { blobs } from '../lib/blobs';
import { store } from '../store';

/** Desk sessions for the text-and-photo desk, stored under households/{hid}/deskSessions. */
const collection = (hid: string) => `households/${hid}/deskSessions`;

const notFound = () => Object.assign(new Error('Desk session not found'), { statusCode: 404 });

export async function createSession(household: Household, body: CreateDeskSessionBody) {
  const patient = deskPatient(household, body.patientMemberId);
  const session: DeskSession = {
    id: `dsk_${randomUUID()}`,
    householdId: household.id,
    patientMemberId: patient.member.id,
    language: body.language,
    hospitalName: body.hospitalName,
    channel: body.channel,
    capturePaths: [],
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  await store.set(collection(household.id), session.id, session);
  return { sessionId: session.id, session, context: deskContext(household, patient) };
}

export async function getSession(household: Household, sid: string) {
  const session = await store.get<DeskSession>(collection(household.id), sid);
  if (!session) throw notFound();
  return session;
}

async function activeSession(household: Household, sid: string) {
  const session = await getSession(household, sid);
  if (session.status !== 'active') {
    throw Object.assign(new Error('Desk session has ended'), { statusCode: 409 });
  }
  return session;
}

/**
 * Stores the photos, reads the estimate and answers with it. A new estimate clears the old billing
 * answer. `keepPhotos: false` (WhatsApp) reads the photos without storing them.
 */
export async function captureEstimate(
  household: Household,
  sid: string,
  images: EstimateImage[],
  opts: { fixture?: string; keepPhotos?: boolean } = {},
) {
  const session = await activeSession(household, sid);
  const capturePaths = [...session.capturePaths];
  for (const img of opts.keepPhotos === false ? [] : images) {
    const path = `households/${household.id}/desk/${sid}/capture-${capturePaths.length + 1}.${extension(img.mimeType)}`;
    await blobs.put(path, img.data, img.mimeType);
    capturePaths.push(path);
  }
  const estimate = await readEstimate(images, opts);
  const reply = answer(household, session.patientMemberId, { estimate }, session.language);
  const updated: DeskSession = {
    ...session,
    estimate,
    hospitalName: session.hospitalName ?? estimate.hospitalName,
    billingTypeAnswer: undefined,
    capturePaths,
    lastAnswer: reply,
    language: reply.locale ?? session.language,
  };
  await save(household, updated);
  await alertHouseholdOwner(household, updated);
  return { estimate, answer: reply };
}

/**
 * An estimate the family told the desk aloud (room rents, days, the quoted total) when no photo
 * is possible yet. Stored like a capture, so evaluate_options and the Why panel work on it.
 */
export async function recordSpokenEstimate(
  household: Household,
  sid: string,
  estimate: HospitalEstimate,
) {
  const session = await activeSession(household, sid);
  const reply = answer(household, session.patientMemberId, { estimate }, session.language);
  const updated: DeskSession = {
    ...session,
    estimate,
    hospitalName: session.hospitalName ?? estimate.hospitalName,
    billingTypeAnswer: undefined,
    lastAnswer: reply,
    language: reply.locale ?? session.language,
  };
  await save(household, updated);
  return { estimate, answer: reply };
}

/** A text turn: a question, the answer to the desk question, or a corrected estimate. */
export async function takeTurn(household: Household, sid: string, body: DeskTurnBody) {
  const session = await activeSession(household, sid);
  const estimate = body.estimate ?? session.estimate;
  const billingTypeAnswer = body.billingTypeAnswer ?? session.billingTypeAnswer;
  const reply: DeskAnswer = answer(
    household,
    session.patientMemberId,
    {
      estimate,
      utteranceText: body.text,
      billingTypeAnswer,
      // The first question gets the opening answer; later ones get the per-room follow-up.
      followUp: Boolean(session.lastQuestion && session.lastAnswer?.cards.length),
    },
    body.language ?? session.language,
  );
  const updated: DeskSession = {
    ...session,
    estimate,
    billingTypeAnswer,
    lastQuestion: body.text?.trim() || session.lastQuestion,
    lastAnswer: reply,
    language: reply.locale ?? session.language,
  };
  await save(household, updated);
  await alertHouseholdOwner(household, updated);
  return reply;
}

/**
 * The engine result straight, for the Why panel and "compare rooms". When the hospital bills by
 * room, the flat-billing branch is attached as `alternate` so the panel can show what the
 * saving would be if it didn't (red-team-response §3).
 */
export async function evaluateSession(
  household: Household,
  sid: string,
  roomOptions?: RoomCategory[],
) {
  const session = await getSession(household, sid);
  if (!session.estimate) {
    throw Object.assign(new Error('No estimate yet: capture one first'), { statusCode: 409 });
  }
  const patient = deskPatient(household, session.patientMemberId);
  const opts = { billingTypeAnswer: session.billingTypeAnswer, roomOptions };
  const evaluation = evaluateDesk(patient, session.estimate, opts);
  if (evaluation.primary.billingType !== 'differential' || evaluation.alternate) return evaluation;
  const flat = evaluateDesk(patient, session.estimate, { ...opts, billingTypeAnswer: 'flat' });
  return { ...evaluation, alternate: flat.primary };
}

export async function endSession(household: Household, sid: string): Promise<DeskSessionSummary> {
  const current = await getSession(household, sid);
  const session: DeskSession = {
    ...current,
    status: 'ended',
    endedAt: current.endedAt ?? new Date().toISOString(),
  };
  await save(household, session);
  return { session, summary: summarise(household, session) };
}

/** One paragraph per language, built from the engine result for the session's estimate. */
function summarise(household: Household, session: DeskSession): Record<Locale, string> {
  const patient = deskPatient(household, session.patientMemberId);
  const name = patient.member.name;
  const hospital = session.hospitalName ?? session.estimate?.hospitalName ?? '';
  const answered = session.estimate && !session.estimate.needsConfirmation;
  if (!answered || patient.policies.length === 0) {
    const where = hospital ? ` (${hospital})` : '';
    return {
      en: `Desk session for ${name}${hospital ? ` at ${hospital}` : ''} ended before Kavach could give an amount.`,
      hi: `${name} का डेस्क सेशन${where} कोई रक़म बताने से पहले ख़त्म हुआ।`,
      ta: `${name}-க்கான டெஸ்க் அமர்வு${where} Kavach ஒரு தொகை சொல்லும் முன் முடிந்தது.`,
      zh: `${name}的柜台会话${where}在 Kavach 给出金额之前结束了。`,
      ms: `Sesi kaunter untuk ${name}${where} tamat sebelum Kavach dapat memberi jumlah.`,
    };
  }

  const ev = evaluateDesk(patient, session.estimate!, {
    billingTypeAnswer: session.billingTypeAnswer,
  });
  const rec = ev.primary.options.find(
    (o) => o.roomCategoryId === ev.primary.recommendedRoomCategoryId,
  )!;
  const first = patient.policies.find((p) => p.id === ev.policyOrder[0])!;
  const money = (n: number) => formatMoney(n, household.country);
  const rent = money(rec.rentPerDay);
  const pays = money(rec.outOfPocket);
  const saving = ev.primary.saving > 0 ? money(ev.primary.saving) : undefined;
  const card = (style: Locale) => policyNickname(first, household, style);
  return {
    en: `At ${hospital} for ${name}, Kavach advised the ${rec.label} (${rent}/day) room, with about ${pays} for the family to pay${saving ? ` (${saving} less than the priciest room)` : ''}, and giving the ${card('en')} card at the TPA desk first.`,
    hi: `${hospital} में ${name} के लिए कवच ने ${rec.label} (${rent}/दिन) कमरे की सलाह दी, परिवार को लगभग ${pays} देने होंगे${saving ? ` (सबसे महँगे कमरे से ${saving} कम)` : ''}, और TPA डेस्क पर पहले ${card('hi')} का कार्ड देने को कहा।`,
    ta: `${hospital}-இல் ${name}-க்கு Kavach ${rec.label} (${rent}/நாள்) அறையைப் பரிந்துரைத்தது; குடும்பம் சுமார் ${pays} செலுத்தும்${saving ? ` (மிக விலையுயர்ந்த அறையை விட ${saving} குறைவு)` : ''}; முதலில் ${card('ta')} கார்டை TPA டெஸ்க்கில் கொடுக்கச் சொன்னது.`,
    zh: `在${hospital}，Kavach 建议${name}选择${rec.label}（${rent}/天）病房，家庭大约自付${pays}${saving ? `（比最贵的病房少${saving}）` : ''}，并先把${card('zh')}的卡交给 TPA 柜台。`,
    ms: `Di ${hospital} untuk ${name}, Kavach menasihatkan bilik ${rec.label} (${rent}/hari), dengan kira-kira ${pays} perlu dibayar keluarga${saving ? ` (${saving} kurang daripada bilik termahal)` : ''}, dan menyerahkan kad ${card('ms')} di kaunter TPA dahulu.`,
  };
}

const save = (household: Household, session: DeskSession) =>
  store.set(collection(household.id), session.id, session);

const extension = (mimeType: string) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' })[
    mimeType
  ] ?? 'bin';
