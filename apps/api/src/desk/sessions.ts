import { randomUUID } from 'node:crypto';
import { formatInr } from '@kavach/engine';
import type {
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

/** A text turn: a question, the answer to the desk question, or a corrected estimate. */
export async function takeTurn(household: Household, sid: string, body: DeskTurnBody) {
  const session = await activeSession(household, sid);
  const estimate = body.estimate ?? session.estimate;
  const billingTypeAnswer = body.billingTypeAnswer ?? session.billingTypeAnswer;
  const reply: DeskAnswer = answer(
    household,
    session.patientMemberId,
    { estimate, utteranceText: body.text, billingTypeAnswer },
    body.language ?? session.language,
  );
  const updated: DeskSession = {
    ...session,
    estimate,
    billingTypeAnswer,
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
    return {
      en: `Desk session for ${name}${hospital ? ` at ${hospital}` : ''} ended before Kavach could give an amount.`,
      hi: `${name} का डेस्क सेशन${hospital ? ` (${hospital})` : ''} कोई रक़म बताने से पहले ख़त्म हुआ।`,
    };
  }

  const ev = evaluateDesk(patient, session.estimate!, {
    billingTypeAnswer: session.billingTypeAnswer,
  });
  const rec = ev.primary.options.find(
    (o) => o.roomCategoryId === ev.primary.recommendedRoomCategoryId,
  )!;
  const first = patient.policies.find((p) => p.id === ev.policyOrder[0])!;
  const room = `${rec.label} (${formatInr(rec.rentPerDay)}/day)`;
  const pays = formatInr(rec.outOfPocket);
  const saving = ev.primary.saving > 0 ? formatInr(ev.primary.saving) : undefined;
  return {
    en: `At ${hospital} for ${name}, Kavach advised the ${room} room, with about ${pays} for the family to pay${saving ? ` (${saving} less than the priciest room)` : ''}, and giving the ${policyNickname(first, household, 'en')} card at the TPA desk first.`,
    hi: `${hospital} में ${name} के लिए कवच ने ${rec.label} (${formatInr(rec.rentPerDay)}/दिन) कमरे की सलाह दी, परिवार को लगभग ${pays} देने होंगे${saving ? ` (सबसे महँगे कमरे से ${saving} कम)` : ''}, और TPA डेस्क पर पहले ${policyNickname(first, household, 'hi')} का कार्ड देने को कहा।`,
  };
}

const save = (household: Household, session: DeskSession) =>
  store.set(collection(household.id), session.id, session);

const extension = (mimeType: string) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' })[
    mimeType
  ] ?? 'bin';
