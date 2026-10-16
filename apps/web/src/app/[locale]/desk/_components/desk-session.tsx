'use client';

import type { DeskAnswer, HospitalEstimate, Locale } from '@kavach/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Camera, FileText, Keyboard, Send, Share2, Scale } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { AnswerCard } from '@/components/kavach/answer-card';
import { Amount } from '@/components/kavach/amount';
import { Captions, type CaptionLine } from '@/components/kavach/captions';
import { ListeningOrb } from '@/components/kavach/listening-orb';
import { RoomCompare } from '@/components/kavach/room-compare';
import { WhyPanel } from '@/components/kavach/why-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { deskClient } from '@/lib/desk-client';
import { AgentStepsTicker } from './agent-steps-ticker';
import { DeskHeader } from './desk-header';

/** S22 + S23: text-mode desk. Photo of the estimate, typed questions, captions and answer cards. */
export function DeskSessionScreen({ sid, demo }: { sid: string; demo: boolean }) {
  const t = useTranslations('desk.session');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const lineId = useRef(0);

  const [captions, setCaptions] = useState<CaptionLine[]>([
    { id: 'hello', who: 'agent', text: t('greeting') },
  ]);
  const [captured, setCaptured] = useState<HospitalEstimate>();
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [answer, setAnswer] = useState<DeskAnswer>();
  const [question, setQuestion] = useState('');
  const [operation, setOperation] = useState<{ id: number; labels: string[] }>();
  const [shared, setShared] = useState(false);

  const household = useQuery({ queryKey: ['desk', 'household'], queryFn: deskClient.getHousehold });
  const session = useQuery({
    queryKey: ['desk', 'session', sid],
    queryFn: () => deskClient.getSession(sid),
  });
  const patient = household.data?.members.find((m) => m.id === session.data?.patientMemberId);
  const estimate = captured ?? session.data?.estimate;

  const say = (who: CaptionLine['who'], text: string) =>
    setCaptions((lines) => [...lines, { id: String(++lineId.current), who, text }]);
  const begin = (labels: string[]) => setOperation({ id: lineId.current, labels });

  const capture = useMutation({
    mutationFn: (photo: File | 'sample') => deskClient.capture(sid, photo),
    onMutate: (photo) => {
      setPhotoUrl(photo === 'sample' ? undefined : URL.createObjectURL(photo));
      say('user', photo === 'sample' ? t('sampleSent') : t('photoSent'));
      begin([t('steps.reading'), t('steps.tariff'), t('steps.policies')]);
    },
    onSuccess: (est) => {
      setCaptured(est);
      say(
        'agent',
        t('estimateRead', {
          hospital: est.hospitalName,
          days: est.days,
          rooms: est.roomCategories.length,
        }),
      );
    },
    onError: () => say('agent', t('captureFailed')),
  });

  const ask = useMutation({
    mutationFn: (text: string) => deskClient.ask(sid, text, locale),
    onMutate: (text) => {
      say('user', text);
      setQuestion('');
      begin([t('steps.policies'), t('steps.rooms'), t('steps.verify')]);
    },
    onSuccess: (reply) => {
      say('agent', reply.text);
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
    mutationFn: () => deskClient.end(sid),
    onSuccess: () => router.push(`/desk/${sid}/summary`),
  });

  const busy = capture.isPending || ask.isPending;

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text && !busy) ask.mutate(text);
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

  const query = demo ? { demo: '1' } : undefined;
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

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-56 pt-4">
        <div className="flex items-center justify-between gap-3">
          <ListeningOrb
            size="sm"
            state={busy ? 'thinking' : 'idle'}
            label={busy ? t('orb.thinking') : t('orb.ready')}
          />
          <Badge icon={Keyboard} className="shrink-0">
            {t('textMode')}
          </Badge>
        </div>

        <Captions lines={captions} />

        {operation && (
          <AgentStepsTicker key={operation.id} labels={operation.labels} running={busy} />
        )}

        {!estimate && !capture.isPending && (
          <Card as="section" aria-labelledby="capture-title" className="flex flex-col gap-3">
            <h2 id="capture-title" className="font-display text-xl font-bold">
              {t('capture.title')}
            </h2>
            <p className="text-muted">{t('capture.hint')}</p>
            <Button size="desk" onClick={() => fileInput.current?.click()}>
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
            <ul className="flex flex-wrap gap-2" aria-label={t('estimate.rooms')}>
              {estimate.roomCategories.map((room) => (
                <li key={room.id} className="rounded-sm bg-sunken px-2 py-1">
                  <Amount value={room.rentPerDay} className="font-semibold" /> {room.label}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-muted">{t('estimate.check')}</p>
              <Button
                variant="ghost"
                size="sm"

                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Camera aria-hidden className="size-5" />
                {t('estimate.retake')}
              </Button>
            </div>
          </Card>
        )}

        {answer && (
          <section aria-label={t('answers')} className="flex flex-col gap-4">
            {answer.cards.map((card, i) => (
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

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3">
          {!answer && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t('suggestions')}>
              {[t('suggest.room'), t('suggest.card')].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => ask.mutate(s)}
                  className="min-h-12 shrink-0 rounded-full border-2 border-primary bg-surface px-4 font-semibold text-primary hover:bg-primary-soft disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={submit} className="flex items-stretch gap-2">
            <Button
              variant="secondary"
              className="min-h-16 min-w-16 shrink-0 px-0"
              aria-label={t('capture.photo')}
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              <Camera aria-hidden className="size-7" />
            </Button>
            <label htmlFor="desk-question" className="sr-only">
              {t('questionLabel')}
            </label>
            <input
              id="desk-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('questionPlaceholder')}
              autoComplete="off"
              className="min-h-16 min-w-0 flex-1 rounded-md border-2 border-border-strong bg-surface px-3 text-lg placeholder:text-muted focus-visible:border-primary"
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
      </div>
    </>
  );
}
