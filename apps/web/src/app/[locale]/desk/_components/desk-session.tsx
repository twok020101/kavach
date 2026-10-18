'use client';

import type { DeskAnswer, HospitalEstimate, Locale } from '@kavach/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Camera,
  FileText,
  Keyboard,
  Mic,
  MicOff,
  RadioTower,
  Send,
  Share2,
  Scale,
  TriangleAlert,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AgentSteps, type AgentStep } from '@/components/kavach/agent-steps';
import { AnswerCard } from '@/components/kavach/answer-card';
import { Amount } from '@/components/kavach/amount';
import { Captions, type CaptionLine } from '@/components/kavach/captions';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { EstimateLines } from '@/components/kavach/estimate-lines';
import { ListeningOrb } from '@/components/kavach/listening-orb';
import { RoomCompare } from '@/components/kavach/room-compare';
import { WhyPanel } from '@/components/kavach/why-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { deskClient } from '@/lib/desk-client';
import { useLiveDesk, type LiveFallback, type LiveStatus } from '@/lib/live/use-live-desk';
import { AgentStepsTicker } from './agent-steps-ticker';
import { CameraCapture } from './camera-capture';
import { DeskHeader } from './desk-header';

/**
 * S22 + S23: the desk. Text mode (photo of the estimate, typed questions) or live voice mode
 * (mic, camera still, spoken answers); both show the same captions and answer cards.
 */
export function DeskSessionScreen({
  sid,
  demo,
  scene,
}: {
  sid: string;
  demo: boolean;
  scene?: 'maternity';
}) {
  const t = useTranslations('desk.session');
  const tc = useTranslations('common');
  const tl = useTranslations('live');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const questionBox = useRef<HTMLTextAreaElement>(null);
  const answers = useRef<HTMLElement>(null);
  const askSection = useRef<HTMLElement>(null);
  const lineId = useRef(0);

  const [captions, setCaptions] = useState<CaptionLine[]>([
    { id: 'hello', who: 'agent', text: t('greeting') },
  ]);
  const [captured, setCaptured] = useState<HospitalEstimate>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [localAnswer, setAnswer] = useState<DeskAnswer>();
  const [question, setQuestion] = useState('');
  const [operation, setOperation] = useState<{ id: number; labels: string[] }>();
  const [shared, setShared] = useState(false);
  const [live, setLive] = useState(false);
  const [fallback, setFallback] = useState<LiveFallback>();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  /** Cards the live agent has shown so far; `all` once its turn is complete (and in text mode). */
  const [shownCards, setShownCards] = useState<Set<string> | 'all'>('all');
  const openCaption = useRef<{ user?: string; agent?: string }>({});
  /** The next live step starts a fresh list (a new turn). */
  const stepsDone = useRef(true);

  const household = useQuery({ queryKey: ['desk', 'household'], queryFn: deskClient.getHousehold });
  const session = useQuery({
    queryKey: ['desk', 'session', sid],
    queryFn: () => deskClient.getSession(sid),
  });
  const patient = household.data?.members.find((m) => m.id === session.data?.patientMemberId);
  const estimate = captured ?? session.data?.estimate;
  // After a reload (a language switch), the session's last answer stands in until a new one arrives.
  const restored = session.data?.lastAnswer;
  const answer = localAnswer ?? (restored?.cards.length ? restored : undefined);

  // Switching language reloads the page: restore this tab's transcript and the session's last answer.
  const transcriptKey = `kavach.desk.${sid}.captions`;
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(transcriptKey);
    } catch {
      // Private mode: start from the greeting.
    }
    if (!saved) return;
    const lines = JSON.parse(saved) as CaptionLine[];
    if (lines.length <= 1) return;
    const tick = setTimeout(() => {
      setCaptions(lines);
      lineId.current = lines.reduce((max, l) => Math.max(max, Number(l.id) || 0), 0);
    }, 0);
    return () => clearTimeout(tick);
  }, [transcriptKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(transcriptKey, JSON.stringify(captions));
    } catch {
      // Nothing to do: the transcript simply won't survive a reload.
    }
  }, [captions, transcriptKey]);

  const say = (who: CaptionLine['who'], text: string) =>
    setCaptions((lines) => [...lines, { id: String(++lineId.current), who, text }]);
  const begin = (labels: string[]) => setOperation({ id: lineId.current, labels });

  /** Live captions grow word by word: update the open line for that speaker, or start one. */
  const caption = (who: CaptionLine['who'], text: string, final: boolean) => {
    const open = openCaption.current[who];
    const id = open ?? String(++lineId.current);
    openCaption.current[who] = final ? undefined : id;
    setCaptions((lines) =>
      open ? lines.map((l) => (l.id === id ? { ...l, text } : l)) : [...lines, { id, who, text }],
    );
  };

  const voice = useLiveDesk(sid, locale, {
    caption,
    step(label, state) {
      const text = t(`steps.${label}` as 'steps.reading');
      const fresh = state === 'start' && stepsDone.current;
      stepsDone.current = false;
      setLiveSteps((steps) => {
        const base = fresh ? [] : steps;
        const others = base.filter((s) => s.label !== text);
        return [...others, { label: text, state: state === 'start' ? 'active' : 'done' }];
      });
    },
    estimate: setCaptured,
    answer(reply) {
      setAnswer(reply);
      setShownCards(new Set());
    },
    card: (card) =>
      setShownCards((shown) => (shown === 'all' ? shown : new Set(shown).add(card.id))),
    turnComplete() {
      setShownCards('all');
      stepsDone.current = true;
    },
    fallback(reason) {
      openCaption.current = {};
      stepsDone.current = true;
      setLive(false);
      setCameraOpen(false);
      setShownCards('all');
      setLiveSteps((steps) => steps.map((s) => ({ ...s, state: 'done' })));
      setFallback(reason);
    },
  });

  function startLive() {
    setFallback(undefined);
    setLive(true);
    // Swap the text-mode greeting for the spoken one, unless the conversation has started.
    setCaptions((lines) =>
      lines.length === 1 && lines[0]!.id === 'hello'
        ? [{ id: 'hello', who: 'agent', text: tl('greeting') }]
        : [...lines, { id: String(++lineId.current), who: 'agent', text: tl('greeting') }],
    );
    void voice.start();
  }

  function stopLive() {
    voice.stop();
    setLive(false);
    setShownCards('all');
  }

  const cameraUnavailable = useCallback(() => {
    setCameraOpen(false);
    fileInput.current?.click();
  }, []);

  /** The camera button: the live camera preview, or the phone's camera in text mode. */
  const showEstimate = () => (live ? setCameraOpen(true) : fileInput.current?.click());

  const capture = useMutation({
    mutationFn: (photo: File | 'sample') =>
      deskClient.capture(
        sid,
        photo,
        scene === 'maternity' ? 'estimate-lotus-maternity' : undefined,
      ),
    onMutate: (photo) => {
      setPhotoUrl(photo === 'sample' ? sampleThumb(scene) : URL.createObjectURL(photo));
      say('user', photo === 'sample' ? t('sampleSent') : t('photoSent'));
      setCameraOpen(false);
      if (!live) begin([t('steps.reading'), t('steps.tariff'), t('steps.policies')]);
    },
    onSuccess: (est) => {
      setCaptured(est);
      // Live: the agent reads the estimate itself and answers aloud.
      if (live) return voice.capture();
      // Not an estimate (a poster, a foreign price list, an unreadable page): say what it is.
      if (est.needsConfirmation && est.lines.length === 0) {
        say('agent', t('estimateUnclear', { note: est.notes[0] ?? '' }));
        return;
      }
      say(
        'agent',
        est.billingType === 'package'
          ? t('packageRead', { hospital: est.hospitalName, rooms: est.roomCategories.length })
          : t('estimateRead', {
              hospital: est.hospitalName,
              days: est.days,
              rooms: est.roomCategories.length,
            }),
      );
    },
    // 415: HEIC or a damaged file; 413: too large. Anything else: the photo could not be read.
    onError: (error) =>
      say(
        'agent',
        error instanceof ApiError && error.status === 415
          ? t('captureUnreadable')
          : error instanceof ApiError && error.status === 413
            ? t('captureTooBig')
            : t('captureFailed'),
      ),
  });

  const ask = useMutation({
    mutationFn: (text: string) => deskClient.ask(sid, text, locale),
    onMutate: (text) => {
      say('user', text);
      setQuestion('');
      begin([t('steps.policies'), t('steps.rooms'), t('steps.verify')]);
    },
    onSuccess: (reply) => {
      // The cards carry the detail, so the caption keeps only the opening sentence.
      say('agent', reply.cards.length ? firstSentence(reply.text) : reply.text);
      setShownCards('all');
      if (reply.cards.length) setAnswer(reply);
    },
    onError: () => say('agent', tc('error')),
  });

  const evaluation = useQuery({
    queryKey: ['desk', 'evaluate', sid, locale],
    queryFn: () => deskClient.evaluate(sid, locale),
    enabled: Boolean(answer),
  });

  const end = useMutation({
    mutationFn: () => {
      voice.stop(true);
      return deskClient.end(sid);
    },
    onSuccess: () => router.push(`/desk/${sid}/summary`),
  });

  const busy = capture.isPending || ask.isPending;

  // The cards are the answer: bring the first one into view when they arrive.
  useEffect(() => {
    if (answer) answers.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [answer]);
  // Once the estimate is read, the next step is the question: bring the two buttons into view.
  useEffect(() => {
    if (estimate && !answer && !live)
      askSection.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [estimate, answer, live]);

  // The question box fits its text: one line empty, up to five as the family types.
  useEffect(() => {
    const el = questionBox.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [question]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    if (live) {
      voice.text(text);
      setQuestion('');
    } else ask.mutate(text);
  }

  function answerBilling(kind: 'differ' | 'same') {
    if (live) voice.billingAnswer(kind === 'same' ? 'flat' : 'differential');
    else ask.mutate(tl(`billing.${kind}Text`));
  }

  async function share() {
    if (!answer) return;
    const text = [answer.text, answer.questionForDesk].filter(Boolean).join('\n');
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
      }
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  }

  const query = demo ? { demo: '1', ...(scene ? { scene } : {}) } : undefined;
  const firstName = patient?.name.split(' ')[0];

  return (
    <>
      <DeskHeader
        title={firstName ? t('title', { name: firstName }) : t('titleLoading')}
        subtitle={session.data?.hospitalName}
        query={query}
        action={
          <Button
            variant="ghost"
            size="sm"

            loading={end.isPending}
            onClick={() => end.mutate()}
          >
            {t('end')}
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 lg:px-6">
        <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pb-48 pt-3 lg:mx-0 lg:max-w-none lg:px-0 lg:pb-12 lg:pt-6">
          {live ? (
            <div className="relative flex flex-col items-center gap-3 py-4">
              <Badge icon={RadioTower} tone="primary" className="absolute right-0 top-0">
                {tl('badge')}
              </Badge>
              <ListeningOrb
                size={voice.status === 'off' ? 'md' : 'lg'}
                state={voice.muted ? 'idle' : orbState(voice.status)}
                label={voice.muted ? tl('orb.muted') : tl(`orb.${liveLabel(voice.status)}`)}
              />
            </div>
          ) : null}

          <Captions lines={captions} />

          {live && liveSteps.length > 0 && <AgentSteps steps={liveSteps} />}

          {!live && operation && busy && (
            <AgentStepsTicker key={operation.id} labels={operation.labels} running={busy} />
          )}

          {!estimate && !capture.isPending && (
            <Card as="section" aria-labelledby="capture-title" className="flex flex-col gap-3">
              <h2 id="capture-title" className="font-display text-xl font-bold">
                {t('capture.title')}
              </h2>
              <p className="text-muted">{t('capture.hint')}</p>
              <Button size="desk" onClick={showEstimate}>
                <Camera aria-hidden className="size-6" />
                {t('capture.photo')}
              </Button>
              {demo && (
                <Button variant="secondary" size="desk" onClick={() => capture.mutate('sample')}>
                  <FileText aria-hidden className="size-6" />
                  {t('capture.sample')}
                </Button>
              )}
            </Card>
          )}

          {estimate && (
            <Card as="section" aria-labelledby="estimate-title" className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                {photoUrl ? (
                  // A local preview of the photo just taken; next/image adds nothing for blob URLs.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrl}
                    alt={t('estimate.photoAlt')}
                    className="size-16 shrink-0 rounded-sm border border-border object-cover"
                  />
                ) : (
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-sm bg-sunken text-muted">
                    <FileText aria-hidden className="size-8" />
                  </span>
                )}
                <div className="min-w-0">
                  <h2 id="estimate-title" className="font-display text-lg font-bold">
                    {estimate.hospitalName}
                  </h2>
                  <p className="text-muted">
                    {estimate.procedure} · {t('estimate.days', { days: estimate.days })}
                  </p>
                </div>
              </div>
              {!answer && (
                <>
                  {estimate.needsConfirmation && estimate.lines.length === 0 ? (
                    <ul className="flex flex-col gap-1 text-partial">
                      {estimate.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="flex flex-wrap gap-2" aria-label={t('estimate.rooms')}>
                      {estimate.roomCategories.map((room) => {
                        // A package list prices the whole stay per room; a tariff prices the room per day.
                        const figure = estimate.packagePrices?.[room.id] ?? room.rentPerDay;
                        return (
                          <li key={room.id} className="rounded-sm bg-sunken px-2 py-1">
                            {figure > 0 && <Amount value={figure} className="font-semibold" />}{' '}
                            {room.label}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-muted">{t('estimate.check')}</p>
                    <Button
                      variant="ghost"
                      size="sm"

                      disabled={busy}
                      onClick={showEstimate}
                    >
                      <Camera aria-hidden className="size-5" />
                      {t('estimate.retake')}
                    </Button>
                  </div>
                </>
              )}
              {estimate.lines.length > 0 && (
                <Disclosure label={t('estimate.lines')} className="-mb-1">
                  <EstimateLines estimate={estimate} result={evaluation.data?.primary} />
                </Disclosure>
              )}
            </Card>
          )}

          {estimate && !answer && !live && (
            <section
              ref={askSection}
              aria-labelledby="ask-title"
              className="flex scroll-mt-28 flex-col gap-2"
            >
              <h2 id="ask-title" className="font-display text-lg font-bold">
                {t('askTitle')}
              </h2>
              {[t('suggest.room'), t('suggest.card')].map((s) => (
                <Button
                  key={s}
                  variant="secondary"
                  size="desk"
                  disabled={busy}
                  onClick={() => ask.mutate(s)}
                >
                  {s}
                </Button>
              ))}
            </section>
          )}

          {answer && (
            <section
              ref={answers}
              aria-label={t('answers')}
              className="flex scroll-mt-28 flex-col gap-4"
            >
              {answer.questionForDesk && answer.cards.some((c) => c.kind === 'billing_branch') && (
                <Card className="flex flex-col gap-3 border-2 border-primary">
                  <p className="font-semibold">{tl('billing.question')}</p>
                  <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => answerBilling('differ')}
                    >
                      {tl('billing.differ')}
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => answerBilling('same')}
                    >
                      {tl('billing.same')}
                    </Button>
                  </div>
                </Card>
              )}
              {answer.cards
                .filter((card) => shownCards === 'all' || shownCards.has(card.id))
                .map((card, i) => (
                  <AnswerCard key={card.id} card={card} index={i}>
                    {card.kind === 'room_compare' && evaluation.data && (
                      <Disclosure
                        label={t('compareRooms')}
                        icon={<Scale aria-hidden className="size-5" />}
                      >
                        <RoomCompare result={evaluation.data.primary} />
                      </Disclosure>
                    )}
                  </AnswerCard>
                ))}

              <Card className="p-2 sm:p-3">
                <Disclosure label={t('why')}>
                  {evaluation.data ? (
                    <WhyPanel evaluation={evaluation.data} estimate={estimate} />
                  ) : (
                    <Spinner label={tc('loading')} />
                  )}
                </Disclosure>
              </Card>

              <DisclaimerBar kind="hospital" className="text-base" />

              <div className="flex flex-col gap-3">
                <Button variant="secondary" size="desk" onClick={share}>
                  <Share2 aria-hidden className="size-6" />
                  {shared ? t('copied') : t('share')}
                </Button>
                <Button
                  variant="ghost"
                  size="desk"
                  loading={end.isPending}
                  onClick={() => end.mutate()}
                >
                  {t('endAndSummary')}
                </Button>
              </div>
            </section>
          )}
        </main>

        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) capture.mutate(file);
            e.target.value = '';
          }}
        />

        {cameraOpen && (
          <CameraCapture
            onCapture={(photo) => capture.mutate(photo)}
            onClose={() => setCameraOpen(false)}
            onUnavailable={cameraUnavailable}
            onSample={demo ? () => capture.mutate('sample') : undefined}
          />
        )}

        <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-24 lg:border-0 lg:bg-transparent lg:pb-0 lg:pt-6">
          {live ? (
            // The one action on top, full width; mute and "type instead" below it.
            <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 lg:px-0 lg:py-0">
              <Button
                variant="accent"
                size="desk"
                className="px-4 text-center"
                disabled={busy}
                onClick={showEstimate}
              >
                <Camera aria-hidden className="size-6 shrink-0" />
                {tl('showEstimate')}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={voice.muted ? 'secondary' : 'primary'}
                  className="min-h-14"
                  aria-pressed={voice.muted}
                  disabled={voice.status === 'connecting'}
                  onClick={voice.toggleMute}
                >
                  {voice.muted ? (
                    <MicOff aria-hidden className="size-6" />
                  ) : (
                    <Mic aria-hidden className="size-6" />
                  )}
                  <span className="truncate">{voice.muted ? tl('unmute') : tl('muteShort')}</span>
                </Button>
                <Button variant="secondary" className="min-h-14" onClick={stopLive}>
                  <Keyboard aria-hidden className="size-6" />
                  <span className="truncate">{tl('typeInstead')}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 lg:px-0 lg:py-0">
              {fallback && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-md border-2 border-partial bg-partial-bg p-3 text-base text-text"
                >
                  <p className="flex items-center gap-2 font-semibold text-partial">
                    <TriangleAlert aria-hidden className="size-5 shrink-0" />
                    {tl('fallback.title')}
                  </p>
                  <p>{tl(`fallback.${fallbackMessage(fallback)}`)}</p>
                  <div className="flex flex-wrap gap-2">
                    {fallback !== 'time_limit' && (
                      <Button variant="secondary" size="sm" onClick={startLive}>
                        <Mic aria-hidden className="size-5" />
                        {tl('fallback.retry')}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setFallback(undefined)}>
                      {tl('fallback.dismiss')}
                    </Button>
                  </div>
                </div>
              )}
              {!fallback && (
                <Button variant="accent" size="desk" onClick={startLive}>
                  <Mic aria-hidden className="size-6" />
                  {tl('talk')}
                </Button>
              )}
              <form onSubmit={submit} className="flex items-stretch gap-2">
                <label htmlFor="desk-question" className="sr-only">
                  {t('questionLabel')}
                </label>
                {/* Grows with the question (up to five lines) so every word stays in view; Enter sends, Shift+Enter breaks a line. */}
                <textarea
                  id="desk-question"
                  ref={questionBox}
                  rows={1}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder={t('questionPlaceholder')}
                  autoComplete="off"
                  className="max-h-44 min-h-16 min-w-0 flex-1 resize-none rounded-md border-2 border-border-strong bg-surface px-3 py-4 text-lg leading-snug placeholder:text-muted focus-visible:border-primary"
                />
                <Button
                  type="submit"
                  className="min-h-16 min-w-16 shrink-0 px-0"
                  aria-label={t('send')}
                  disabled={busy || !question.trim()}
                >
                  <Send aria-hidden className="size-7" />
                </Button>
              </form>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

/** A small JPEG of the sample estimate photo, so the card shows what was "captured". */
const sampleThumb = (scene?: 'maternity') =>
  scene === 'maternity'
    ? '/samples/lotus-maternity-estimate-thumb.jpg'
    : '/samples/city-heart-estimate-thumb.jpg';

/** The first sentence of an answer, in English (.!?) or Hindi (।). */
const firstSentence = (text: string) => {
  const match = /^[^.!?।]*[.!?।]/.exec(text.trim());
  return match ? match[0] : text;
};

const orbState = (status: LiveStatus) =>
  status === 'speaking' ? 'speaking' : status === 'listening' ? 'listening' : 'thinking';

const liveLabel = (status: LiveStatus) => (status === 'off' ? 'connecting' : status);

const fallbackMessage = (reason: LiveFallback) =>
  reason === 'connection_lost' || reason === 'mic_denied' || reason === 'time_limit'
    ? reason
    : 'other';
