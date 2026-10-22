'use client';

import type { DeskAnswer, HospitalEstimate, Locale } from '@kavach/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AgentSteps, type AgentStep } from '@/components/kavach/agent-steps';
import { AnswerCard } from '@/components/kavach/answer-card';
import type { CaptionLine } from '@/components/kavach/captions';
import { Icon } from '@/components/kavach/icon';
import { WhyPanel } from '@/components/kavach/why-panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Disclosure } from '@/components/ui/disclosure';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { ApiError } from '@/lib/api';
import { CountryProvider } from '@/lib/country';
import { deskClient } from '@/lib/desk-client';
import { useDesktop } from '@/lib/use-media';
import { useLiveDesk, type LiveFallback, type LiveStatus } from '@/lib/live/use-live-desk';
import { AgentStepsTicker } from './agent-steps-ticker';
import { CameraCapture } from './camera-capture';
import { DeskHeader } from './desk-header';
import type { DeskScene } from './desk-start';
import { AdviceCompare } from './session/advice-compare';
import { ControlsCard } from './session/controls-card';
import { EstimatePanel } from './session/estimate-panel';
import { OrbCard } from './session/orb-card';
import { PromptsCard } from './session/prompts-card';
import { RulesCard } from './session/rules-card';
import { SavingCard } from './session/saving-card';
import { SessionFooter } from './session/session-footer';
import { TranscriptCard } from './session/transcript-card';

/**
 * S22 + S23: the desk, as the Stitch live co-pilot console. Text mode (photo of the estimate,
 * typed questions) or live voice mode (mic, camera still, spoken answers); both show the same
 * captions, scanned bill, saving and answer cards. At 1280 px and up it is three columns
 * (conversation | estimate | desk controls and answers), two at 1024, one on a phone with the
 * controls docked at the bottom. In the demo the sample estimate is read as the session opens.
 */
export function DeskSessionScreen({
  sid,
  demo,
  scene,
}: {
  sid: string;
  demo: boolean;
  scene?: DeskScene;
}) {
  const t = useTranslations('desk.session');
  const tc = useTranslations('common');
  const tl = useTranslations('live');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const questionBox = useRef<HTMLTextAreaElement>(null);
  const answers = useRef<HTMLDivElement>(null);
  const bill = useRef<HTMLDivElement>(null);
  const lineId = useRef(0);
  /** The demo reads the sample estimate once, by itself, when the session opens without one. */
  const autoCaptured = useRef(false);
  /** True while the last capture was the automatic one: the page then stays where it is. */
  const quiet = useRef(false);

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
  // After a reload (a language switch) or a capture, the session's last answer stands in until a new one arrives.
  const restored = session.data?.lastAnswer;
  const answer = localAnswer ?? (restored?.cards.length ? restored : undefined);

  /** A new estimate or a new answer to the desk question changes the engine's result. */
  const refreshEvaluation = () =>
    queryClient.invalidateQueries({ queryKey: ['desk', 'evaluate', sid] });

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
    estimate(est) {
      setCaptured(est);
      void refreshEvaluation();
    },
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
  const showEstimate = () => {
    quiet.current = false;
    if (live) setCameraOpen(true);
    else fileInput.current?.click();
  };

  const capture = useMutation({
    mutationFn: (photo: File | 'sample') =>
      deskClient.capture(
        sid,
        photo,
        scene === 'maternity'
          ? 'estimate-lotus-maternity'
          : scene === 'singapore'
            ? 'estimate-sample-general-sg'
            : undefined,
      ),
    onMutate: (photo) => {
      setPhotoUrl(photo === 'sample' ? sampleThumb(scene) : URL.createObjectURL(photo));
      say('user', photo === 'sample' ? t('sampleSent') : t('photoSent'));
      setCameraOpen(false);
      if (!live) begin([t('steps.reading'), t('steps.tariff'), t('steps.policies')]);
    },
    onSuccess: (est) => {
      setCaptured(est);
      void refreshEvaluation();
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
      // The desk core answered the estimate as it read it (the session's last answer): show
      // those cards, with the answer's opening sentence in the captions.
      setAnswer(undefined);
      void session.refetch().then(({ data }) => {
        const reply = data?.lastAnswer;
        if (reply?.cards.length) say('agent', firstSentence(reply.text));
      });
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

  const takeSample = () => {
    quiet.current = false;
    capture.mutate('sample');
  };

  // The demo opens on a working console: read the sample estimate once, if the session has none.
  useEffect(() => {
    if (!demo || autoCaptured.current || !session.data) return;
    if (session.data.status !== 'active' || session.data.estimate || captured) return;
    autoCaptured.current = true;
    quiet.current = true;
    capture.mutate('sample');
  }, [demo, session.data, captured, capture]);

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
      void refreshEvaluation();
    },
    onError: () => say('agent', tc('error')),
  });

  const readable = Boolean(
    estimate && !(estimate.needsConfirmation && estimate.lines.length === 0),
  );
  const evaluation = useQuery({
    queryKey: ['desk', 'evaluate', sid, locale],
    queryFn: () => deskClient.evaluate(sid, locale),
    // The engine runs as soon as there is a readable estimate (the bill flags, saving and rules).
    enabled: readable,
  });

  const end = useMutation({
    mutationFn: () => {
      voice.stop(true);
      return deskClient.end(sid);
    },
    onSuccess: () => router.push(`/desk/${sid}/summary`),
  });

  const busy = capture.isPending || ask.isPending;
  const desktop = useDesktop();

  // A typed or spoken answer: on a phone, bring its cards into view.
  useEffect(() => {
    if (localAnswer && !desktop)
      answers.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [localAnswer, desktop]);
  // A photo the family just took: on a phone, show the bill it became (not for the demo's own read).
  useEffect(() => {
    if (captured && !live && !desktop && !quiet.current)
      bill.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [captured, live, desktop]);

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

  /** A quick question or the saving card's action: spoken to the live agent, or asked in text. */
  function askKavach(text: string) {
    if (busy) return;
    if (live) voice.text(text);
    else ask.mutate(text);
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
  // The admitted row: everyone in the family, the patient marked (Stitch desk co-pilot).
  const members = household.data?.members.map((m) => ({
    id: m.id,
    label: t('memberChip', {
      name: m.name.split(' ')[0] ?? m.name,
      relation: tc(`relation.${m.relation}`),
      age: m.age,
    }),
    current: m.id === session.data?.patientMemberId,
  }));

  const open = session.data?.status !== 'ended';
  const visibleCards =
    answer?.cards.filter((card) => shownCards === 'all' || shownCards.has(card.id)) ?? [];
  const askCard = visibleCards.find((c) => c.kind === 'ask_desk');
  // The ask-desk lines have their own card; the room comparison is the saving card once the engine has run.
  const otherCards = visibleCards.filter(
    (c) => c.kind !== 'ask_desk' && !(c.kind === 'room_compare' && evaluation.data),
  );
  const deskQuestion = answer?.questionForDesk ?? evaluation.data?.questionForDesk;
  const suggestions = estimate && !live ? [t('suggest.room'), t('suggest.card')] : undefined;
  const orbState = live ? (voice.muted ? 'idle' : liveOrbState(voice.status)) : 'idle';
  const orbLabel = live
    ? voice.muted
      ? tl('orb.muted')
      : tl(`orb.${liveLabel(voice.status)}`)
    : busy
      ? t('orb.thinking')
      : t('orb.ready');
  const steps =
    live && liveSteps.length > 0 ? (
      <AgentSteps steps={liveSteps} />
    ) : !live && operation && busy ? (
      <AgentStepsTicker key={operation.id} labels={operation.labels} running={busy} />
    ) : undefined;
  const subtitle = [estimate?.hospitalName ?? session.data?.hospitalName, estimate?.procedure]
    .filter(Boolean)
    .join(' · ');

  return (
    <CountryProvider country={household.data?.country}>
      <DeskHeader
        title={firstName ? t('title', { name: firstName }) : t('titleLoading')}
        chip={
          session.data && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-safe/25 bg-safe-bg px-2.5 py-0.5 text-xs font-semibold text-safe">
              {open ? (
                <span aria-hidden className="live-dot desk-live" />
              ) : (
                <Icon name="lock" className="text-sm" />
              )}
              {open ? t('status.open') : t('status.ended')}
            </span>
          )
        }
        subtitle={subtitle || undefined}
        status={
          live ? (
            <span className="inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary-soft px-3 py-2 text-xs font-semibold text-primary-hover">
              <span aria-hidden className="live-dot desk-live desk-live--voice" />
              {tl('badge')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-md border border-border bg-sunken px-3 py-2 text-xs font-semibold text-muted">
              <Icon name="keyboard" className="text-base" />
              {t('textMode')}
            </span>
          )
        }
        query={query}
        demoScene={demo ? (scene ?? 'hospital') : undefined}
        members={members}
        action={
          <Button
            variant="ghost"
            size="sm"
            className="text-gap hover:bg-gap-bg"
            loading={end.isPending}
            onClick={() => end.mutate()}
          >
            {t('end')}
            <Icon name="close" className="text-xl" />
          </Button>
        }
      />

      <div className="pb-56 lg:pb-0">
        <div className="mx-auto w-full max-w-[1400px] px-4 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:items-start lg:gap-6 lg:px-6 lg:py-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
          {/* Columns 1 and 2: stacked at 1024, side by side at 1280 (the wrapper dissolves). */}
          <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1 xl:contents">
            <div className="flex flex-col gap-5 xl:col-start-1 xl:row-start-1">
              <OrbCard
                live={live}
                state={orbState}
                label={orbLabel}
                hint={live ? tl('talkHint') : t('orb.idleHint')}
                muted={voice.muted}
                muteDisabled={voice.status === 'connecting'}
                onToggleMute={voice.toggleMute}
                className={cn('shrink-0', !live && 'hidden lg:flex')}
              />
              <TranscriptCard lines={captions} steps={steps} />
              {/* At 1280 the answer cards sit under the conversation; narrower, in column 3. */}
              {otherCards.length > 0 && (
                <div className="hidden flex-col gap-4 xl:flex">
                  {otherCards.map((card, i) => (
                    <AnswerCard key={card.id} card={card} index={i} />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-5 xl:col-start-2 xl:row-start-1">
              <EstimatePanel
                demo={demo}
                estimate={estimate}
                result={evaluation.data?.primary}
                checking={evaluation.isFetching}
                capturing={capture.isPending}
                busy={busy}
                photoUrl={photoUrl}
                onPhoto={showEstimate}
                onSample={takeSample}
                billRef={bill}
              />
              {estimate && evaluation.data && !capture.isPending && (
                <AdviceCompare
                  result={evaluation.data.primary}
                  quotedRoomId={estimate.roomCategories[0]?.id}
                />
              )}
              {evaluation.data && <RulesCard evaluation={evaluation.data} estimate={estimate} />}
              {readable && (
                <div className="rounded-xl border border-border bg-surface px-3 py-1 shadow-1">
                  <Disclosure label={t('why')} icon={<Icon name="help" className="text-xl" />}>
                    {evaluation.data ? (
                      <div className="pb-3">
                        <WhyPanel evaluation={evaluation.data} estimate={estimate} />
                      </div>
                    ) : (
                      <Spinner label={tc('loading')} />
                    )}
                  </Disclosure>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: desk controls (the phone's bottom dock), the saving and the answer. */}
          <div className="mt-5 flex flex-col gap-5 lg:col-start-2 lg:row-start-1 lg:mt-0 xl:col-start-3">
            <ControlsCard
              live={live}
              muted={voice.muted}
              connecting={voice.status === 'connecting'}
              busy={busy}
              fallback={fallback ? fallbackMessage(fallback) : undefined}
              onRetry={startLive}
              onDismiss={() => setFallback(undefined)}
              onTalk={startLive}
              onStop={stopLive}
              onShowEstimate={showEstimate}
              onToggleMute={voice.toggleMute}
              question={question}
              onQuestion={setQuestion}
              onSubmit={submit}
              questionRef={questionBox}
              suggestions={suggestions}
              onSuggest={askKavach}
            />

            {/* On a phone the quick questions sit in the page, the dock stays small. */}
            {suggestions && !answer && (
              <section aria-label={t('askTitle')} className="flex flex-col gap-2 lg:hidden">
                <h2 className="font-display text-lg font-bold">{t('askTitle')}</h2>
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    variant="secondary"
                    size="desk"
                    disabled={busy}
                    onClick={() => askKavach(s)}
                  >
                    {s}
                  </Button>
                ))}
              </section>
            )}

            {answer?.questionForDesk && answer.cards.some((c) => c.kind === 'billing_branch') && (
              <section className="rise-in flex flex-col gap-3 rounded-xl border-2 border-primary bg-surface p-4 shadow-1">
                <p className="font-semibold">{tl('billing.question')}</p>
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                  <Button
                    variant="secondary"
                    className="min-h-16 lg:min-h-12"
                    disabled={busy}
                    onClick={() => answerBilling('differ')}
                  >
                    {tl('billing.differ')}
                  </Button>
                  <Button
                    variant="secondary"
                    className="min-h-16 lg:min-h-12"
                    disabled={busy}
                    onClick={() => answerBilling('same')}
                  >
                    {tl('billing.same')}
                  </Button>
                </div>
              </section>
            )}

            {evaluation.data && !capture.isPending && (
              <SavingCard
                result={evaluation.data.primary}
                busy={busy}
                onOpt={(room) => askKavach(t('saving.optAsk', { room }))}
              />
            )}

            {(estimate || answer) && (
              <PromptsCard
                card={askCard}
                question={deskQuestion}
                language={answer?.locale ?? session.data?.language ?? locale}
              />
            )}

            {otherCards.length > 0 && (
              <div
                ref={answers}
                aria-label={t('answers')}
                role="region"
                className="flex scroll-mt-40 flex-col gap-4 xl:hidden"
              >
                {otherCards.map((card, i) => (
                  <AnswerCard key={card.id} card={card} index={i} />
                ))}
              </div>
            )}

            {answer && (
              <div className="flex flex-col gap-3">
                <Button variant="secondary" size="desk" className="lg:min-h-12" onClick={share}>
                  <Icon name="share" className="text-2xl" />
                  {shared ? t('copied') : t('share')}
                </Button>
                <Button
                  variant="ghost"
                  size="desk"
                  className="lg:min-h-12"
                  loading={end.isPending}
                  onClick={() => end.mutate()}
                >
                  {t('endAndSummary')}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <SessionFooter sid={sid} demo={demo} open={open} />
        </div>
      </div>

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
          onSample={demo ? takeSample : undefined}
        />
      )}
    </CountryProvider>
  );
}

/** A small JPEG of the sample estimate photo, so the bill shows what was "captured". */
const sampleThumb = (scene?: DeskScene) =>
  scene === 'maternity'
    ? '/samples/lotus-maternity-estimate-thumb.jpg'
    : scene === 'singapore'
      ? '/samples/sample-general-sg-estimate-thumb.jpg'
      : '/samples/city-heart-estimate-thumb.jpg';

/** The first sentence of an answer: English and Malay (.!?), Hindi (।) or Chinese (。！？). */
const firstSentence = (text: string) => {
  const match = /^[^.!?।。！？]*[.!?।。！？]/.exec(text.trim());
  return match ? match[0] : text;
};

const liveOrbState = (status: LiveStatus) =>
  status === 'speaking' ? 'speaking' : status === 'listening' ? 'listening' : 'thinking';

const liveLabel = (status: LiveStatus) => (status === 'off' ? 'connecting' : status);

const fallbackMessage = (reason: LiveFallback) =>
  reason === 'connection_lost' || reason === 'mic_denied' || reason === 'time_limit'
    ? reason
    : 'other';
