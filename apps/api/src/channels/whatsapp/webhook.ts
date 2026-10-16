import type {
  DeskAnswer,
  DeskSession,
  Household,
  Locale,
  Member,
  WhatsAppSender,
} from '@kavach/schemas';
import { classifyMedia, understandVoiceNote } from '../../agents/whatsapp-media';
import { detectBillingAnswer, detectLocale } from '../../core/intent';
import { captureEstimate, createSession, getSession, takeTurn } from '../../desk/sessions';
import { pcmToOggOpus, synthesizeSpeech } from '../../lib/speech';
import { store } from '../../store';
import { shareAnswer } from './cards';
import { readForwardedClaimLetter } from './claim-letter';
import { WA_COPY } from './copy';
import { sendPendingLetter } from './nudges';
import { adapters, deliver } from './outbox';
import {
  grantConsent,
  hasConsent,
  link,
  linkDemoOwner,
  optOut,
  resolveMember,
  saveSender,
  touchSender,
  withinRateLimit,
} from './senders';
import type { Inbound, Media, Outgoing } from './types';

const YES = /^(yes|y|haan|han|ha|haa|हाँ|हां|हा|ji|जी|ok|okay)[\s!.]*$/i;
const STOP = /^(stop|unsubscribe|रोकें|बंद)[\s!.]*$/i;
const DEMO_OWNER = /^rahul[\s!.]*$/i;
const GREETING = /^(hi|hello|hey|namaste|namaskar|नमस्ते|नमस्कार|help|menu)[\s!.]*$/i;
const ON_TOPIC =
  /insur|policy|polic|hospital|room|estimate|claim|cover|premium|bill|tpa|cashless|doctor|surgery|operation|admit|icu|mediclaim|deduct|settle|angio|bima|aspatal|kamra|kamre|ilaj|बीमा|पॉलिसी|अस्पताल|हॉस्पिटल|कमर|एस्टिमेट|क्लेम|दावा|इलाज|ऑपरेशन|डॉक्टर|भर्ती|बिल|खर्च|एंजियो|सर्जरी|पापा|मम्मी/i;
/** A WhatsApp desk session stays open this long after it starts. */
const SESSION_MS = 12 * 60 * 60 * 1000;

const isAudio = (m: { mimeType: string }) => m.mimeType.startsWith('audio/');
const isDocument = (m: { mimeType: string }) =>
  m.mimeType.startsWith('image/') || m.mimeType === 'application/pdf';

/**
 * One inbound WhatsApp message, from either provider or the dev simulator, through the same
 * desk core as the app (docs/plan/06-api.md "WhatsApp"). Media is held in memory only.
 */
export async function handleInbound(msg: Inbound): Promise<void> {
  const seenKey = `${msg.provider}_${msg.messageId}`;
  if (await store.get('whatsappInbound', seenKey)) return;
  await store.set('whatsappInbound', seenKey, { at: new Date().toISOString() });

  const sender = await touchSender(msg.from, msg.provider, msg.simulated ?? false);
  const text = msg.text?.trim() ?? '';
  let lang: Locale = detectLocale(text, 'hi');
  const reply = (out: Outgoing) => deliver(sender, out);
  const say = (pick: (c: (typeof WA_COPY)[Locale]) => string) =>
    reply({ kind: 'text', text: pick(WA_COPY[lang]) });

  const rate = await withinRateLimit(sender);
  if (!rate.ok) {
    if (rate.justHit) await say((c) => c.rateLimited);
    return;
  }
  if (STOP.test(text)) {
    await optOut(sender);
    return void (await say((c) => c.stopped));
  }

  let found: { household: Household; member: Member } | undefined;
  if (msg.householdId) {
    const household = await store.get<Household>('households', msg.householdId);
    const member = household?.members.find((m) => m.phone === msg.from);
    if (household && member) {
      await link(sender, household.id, member.id);
      found = { household, member };
    }
  }
  if (DEMO_OWNER.test(text)) found = await linkDemoOwner(sender);
  found ??= await resolveMember(sender);
  if (!found)
    return void (await reply({
      kind: 'text',
      text: `${WA_COPY.hi.unknown}\n\n${WA_COPY.en.unknown}`,
    }));
  const { household, member } = found;
  lang = detectLocale(text, member.language);

  if (!hasConsent(sender)) {
    if (YES.test(text)) {
      await grantConsent(sender, household, member.id);
      return void (await say((c) => c.consentThanks));
    }
    // Nothing is downloaded or read before consent.
    if (DEMO_OWNER.test(text)) await say((c) => c.linkedDemo(member.name));
    return void (await say((c) => c.consent));
  }
  if (DEMO_OWNER.test(text)) return void (await say((c) => c.linkedDemo(member.name)));
  if (YES.test(text) && msg.media.length === 0) {
    if (sender.pendingLetter) return sendPendingLetter(sender, lang);
    return void (await say((c) => c.help));
  }

  const adapter = adapters[msg.provider];
  const media: Media[] = await Promise.all(
    msg.media.map(async (m) => ({
      data: m.data ?? (await adapter.download(m)),
      mimeType: m.mimeType,
      filename: m.filename,
    })),
  );
  try {
    await converse({ household, member, sender, text, media, lang, reply });
  } finally {
    // Media is deleted after processing: our copy goes out of scope; ask the provider to drop theirs.
    await Promise.all(msg.media.map((m) => adapter.deleteMedia?.(m).catch(() => undefined)));
  }
}

async function converse(input: {
  household: Household;
  member: Member;
  sender: WhatsAppSender;
  text: string;
  media: Media[];
  lang: Locale;
  reply: (out: Outgoing) => Promise<unknown>;
}) {
  const { household, member, sender, media, reply } = input;
  let { text, lang } = input;
  const t = () => WA_COPY[lang];

  const audio = media.find(isAudio);
  const docs = media.filter(isDocument);

  if (audio) {
    const note = await understandVoiceNote(audio);
    if (!note.onTopic && docs.length === 0) return reply({ kind: 'text', text: t().offTopic });
    text = [text, note.transcript].filter(Boolean).join(' ');
    lang = note.language;
  }

  const open = await openSession(household, sender);
  if (docs.length === 0 && !audio) {
    if (!text || GREETING.test(text)) return reply({ kind: 'text', text: t().help });
    const answersDesk = open?.estimate && detectBillingAnswer(text);
    if (!ON_TOPIC.test(text) && !answersDesk) return reply({ kind: 'text', text: t().offTopic });
  }

  if (docs.length > 0) {
    const kind = await classifyMedia(docs, text);
    if (kind === 'settlement_letter') {
      await reply({ kind: 'text', text: t().readingLetter });
      for (const message of await readForwardedClaimLetter({ household, member, files: docs })) {
        await reply(message);
      }
      return;
    }
    if (kind === 'other') return reply({ kind: 'text', text: t().notADocument });
  }

  const session = open ?? (await startSession(household, sender, member, lang));
  let answer: DeskAnswer | undefined;
  if (docs.length > 0) {
    await reply({ kind: 'text', text: t().reading });
    answer = (await captureEstimate(household, session.id, docs, { keepPhotos: false })).answer;
  }
  if (text || !answer) answer = await takeTurn(household, session.id, { text, language: lang });
  const latest = await getSession(household, session.id);
  await replyWithAnswer(household, latest, answer, Boolean(audio), reply);
}

/** W2: voice note of the `say` line (when they sent one), the card image, then the text and link. */
async function replyWithAnswer(
  household: Household,
  session: DeskSession,
  answer: DeskAnswer,
  voice: boolean,
  reply: (out: Outgoing) => Promise<unknown>,
) {
  const locale = answer.locale ?? session.language;
  if (voice) {
    const pcm = await synthesizeSpeech(answer.say, { fixture: 'whatsapp-tts-reply' });
    await reply({ kind: 'audio', data: await pcmToOggOpus(pcm) });
  }
  const hasCards = answer.cards.some((c) => c.kind === 'room_compare' || c.kind === 'warning');
  if (!hasCards) return reply({ kind: 'text', text: answer.text });

  const patient = household.members.find((m) => m.id === session.patientMemberId)!;
  const share = await shareAnswer({
    answer,
    locale,
    patientName: patient.name,
    hospitalName: session.hospitalName ?? session.estimate?.hospitalName,
    isDemo: household.isDemo,
  });
  await reply({ kind: 'image', url: share.imageUrl });
  await reply({
    kind: 'text',
    text: `${answer.text}\n\n${WA_COPY[locale].fullCard}: ${share.pageUrl}`,
  });
}

/** The number's open WhatsApp desk session, if it is still active and recent. */
async function openSession(household: Household, sender: WhatsAppSender) {
  if (!sender.deskSessionId) return undefined;
  const session = await getSession(household, sender.deskSessionId).catch(() => undefined);
  const fresh = session && Date.now() - Date.parse(session.createdAt) < SESSION_MS;
  return session?.status === 'active' && fresh ? session : undefined;
}

/** The patient is a parent other than the sender (the hero: Kamala asks about Suresh). */
async function startSession(
  household: Household,
  sender: WhatsAppSender,
  member: Member,
  language: Locale,
) {
  const parents = household.members.filter(
    (m) => ['parent', 'parent_in_law'].includes(m.relation) && m.id !== member.id,
  );
  const patient = parents[0] ?? member;
  const { session } = await createSession(household, {
    patientMemberId: patient.id,
    language,
    channel: 'whatsapp',
  });
  sender.deskSessionId = session.id;
  await saveSender(sender);
  return session;
}
