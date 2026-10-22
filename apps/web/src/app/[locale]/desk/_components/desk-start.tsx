'use client';

import type { Locale } from '@kavach/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { AgentSteps } from '@/components/kavach/agent-steps';
import { Icon } from '@/components/kavach/icon';
import { ListeningOrb } from '@/components/kavach/listening-orb';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { deskClient, type DemoScene } from '@/lib/desk-client';
import { CloseIcon, DeskHeader } from './desk-header';

export type DeskScene = Exclude<DemoScene, 'hospital'>;

/**
 * The demo scenes: Suresh's angioplasty in Hindi (HX-1), Priya's delivery in English (MX-1),
 * or Ah Kow's angioplasty in Singapore, in Mandarin (SX-1).
 */
const SCENES: Record<DemoScene, { patient: string; language: Locale }> = {
  hospital: { patient: 'mem_suresh', language: 'hi' },
  maternity: { patient: 'mem_priya', language: 'en' },
  singapore: { patient: 'mem_ahkow', language: 'zh' },
};

/**
 * S21 Hospital start: who is admitted, which language, one big Start. In the demo the scene
 * starts by itself (the family moved to the scene's checkpoint, the session opened in the
 * scene's language) behind a "Preparing the scene" card; if that fails, the picker is the way in.
 */
export function DeskStart({ demo, scene }: { demo: boolean; scene?: DeskScene }) {
  const t = useTranslations('desk.start');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const preset = SCENES[scene ?? 'hospital'];
  const [patientId, setPatientId] = useState<string | null>(demo ? preset.patient : null);
  // The Singapore scene answers in Malay when the page is in Malay, else Mandarin.
  const presetLanguage: Locale = scene === 'singapore' && locale === 'ms' ? 'ms' : preset.language;
  const [language, setLanguage] = useState<Locale>(demo ? presetLanguage : locale);
  /** The demo starts by itself; the picker shows for a real family, or if the demo start failed. */
  const [manual, setManual] = useState(!demo);
  const [phase, setPhase] = useState(0);
  const autoStarted = useRef(false);
  const query = demo ? { demo: '1', ...(scene ? { scene } : {}) } : undefined;

  const queryClient = useQueryClient();
  // Held back while the demo starts by itself: both would otherwise create a demo family.
  const household = useQuery({
    queryKey: ['desk', 'household'],
    queryFn: deskClient.getHousehold,
    enabled: manual,
  });
  const start = useMutation({
    mutationFn: async (input: { patientMemberId: string; language: Locale }) => {
      setPhase(0);
      if (demo) {
        await deskClient.prepareScene(scene ?? 'hospital');
        // The family's claims, documents and plan belong to the new checkpoint now.
        await queryClient.invalidateQueries();
      }
      setPhase(1);
      const started = await deskClient.startSession(input);
      setPhase(2);
      return { ...started, language: input.language };
    },
    onSuccess: ({ sessionId, language: lang }) =>
      router.push({ pathname: `/desk/${sessionId}`, query: query ?? {} }, { locale: lang }),
    onError: () => setManual(true),
  });

  useEffect(() => {
    if (!demo || autoStarted.current) return;
    autoStarted.current = true;
    start.mutate({ patientMemberId: preset.patient, language: presetLanguage });
  }, [demo, preset, presetLanguage, start]);

  const header = (
    <DeskHeader
      title={t('title')}
      query={query}
      action={
        <Link
          href="/"
          aria-label={tc('close')}
          className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'min-w-12 px-0' })}
        >
          <CloseIcon />
        </Link>
      }
    />
  );

  if (!manual) {
    const steps = [t('prepare.steps.family'), t('prepare.steps.session'), t('prepare.steps.open')];
    return (
      <>
        {header}
        <main className="mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full max-w-xl flex-col justify-center px-4 py-10">
          <section
            aria-labelledby="prepare-title"
            aria-busy="true"
            className="rise-in flex flex-col items-center gap-6 rounded-xl border border-border bg-surface px-6 pb-8 pt-14 text-center shadow-2"
          >
            <ListeningOrb size="lg" state="thinking" label={t('prepare.title')} />
            <div className="-mt-3 flex flex-col items-center gap-1">
              <span className="label text-primary-hover">{t('prepare.eyebrow')}</span>
              <p id="prepare-title" className="text-base text-muted">
                {t(`prepare.${scene ?? 'hospital'}`)}
              </p>
            </div>
            <div className="desk-prepare-bar w-full max-w-xs" aria-hidden />
            <AgentSteps
              className="w-full max-w-xs text-left text-base"
              steps={steps.map((label, i) => ({
                label,
                state: i < phase ? 'done' : i === phase ? 'active' : 'pending',
              }))}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Icon name="science" className="text-sm" />
              {t('prepare.note')}
            </p>
          </section>
        </main>
      </>
    );
  }

  const tile =
    'press relative flex cursor-pointer items-center gap-3 rounded-md border-2 bg-surface p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';
  const selectedTile = 'border-primary bg-primary-soft';
  const idleTile = 'border-border hover:border-border-strong';

  return (
    <>
      {header}
      <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10 lg:px-6">
        <main className="mx-auto flex max-w-2xl flex-col gap-7 px-4 pb-40 pt-5 lg:mx-0 lg:max-w-none lg:px-0 lg:pb-12 lg:pt-6">
          {demo && start.isError && (
            <p role="alert" className="panel panel-partial flex gap-2 text-base">
              <Icon name="warning" className="mt-0.5 text-xl text-partial" />
              {t('prepare.failed')}
            </p>
          )}
          {demo && (
            <p className="panel flex gap-2 text-base">
              <Icon name="info" className="mt-0.5 text-xl" />
              {scene === 'maternity'
                ? t('demoNoteMaternity')
                : scene === 'singapore'
                  ? t('demoNoteSingapore')
                  : t('demoNote')}
            </p>
          )}

          <fieldset>
            <legend className="mb-3 font-display text-2xl font-bold">{t('who')}</legend>
            {household.isPending ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {household.data?.members.map((m) => {
                  const on = patientId === m.id;
                  return (
                    <label
                      key={m.id}
                      className={cn(tile, 'min-h-14', on ? selectedTile : idleTile)}
                    >
                      <input
                        type="radio"
                        name="patient"
                        value={m.id}
                        checked={on}
                        onChange={() => setPatientId(m.id)}
                        className="sr-only"
                      />
                      <MemberAvatar member={m} className="size-10 text-base" />
                      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">{m.name.split(' ')[0]}</span>
                        <span className="text-sm text-muted">
                          {tc(`relation.${m.relation}`)}, {m.age}
                        </span>
                      </span>
                      {on && <Icon name="check" weight={600} className="text-xl text-primary" />}
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset>
            <legend className="mb-3 font-display text-2xl font-bold">{t('language')}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {routing.locales.map((l) => {
                const on = language === l;
                return (
                  <label
                    key={l}
                    lang={l}
                    className={cn(
                      tile,
                      'min-h-16 justify-center text-lg font-semibold',
                      on ? selectedTile : idleTile,
                    )}
                  >
                    <input
                      type="radio"
                      name="language"
                      value={l}
                      checked={on}
                      onChange={() => setLanguage(l)}
                      className="sr-only"
                    />
                    {on && <Icon name="check" weight={600} className="text-xl text-primary" />}
                    {tc(`languages.${l}`)}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <p className="text-base text-muted">{t('privacy')}</p>
        </main>

        <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-24 lg:border-0 lg:bg-transparent lg:pb-0 lg:pt-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3 lg:px-0 lg:py-0">
            <Button
              variant="accent"
              size="desk"
              disabled={!patientId}
              loading={start.isPending}
              onClick={() => start.mutate({ patientMemberId: patientId!, language })}
            >
              <Icon name="mic" fill className="text-2xl" />
              {demo && start.isError ? t('prepare.retry') : t('start')}
              <Icon name="arrow_forward" className="text-2xl" />
            </Button>
            {!patientId && <p className="text-center text-base text-muted">{t('pickFirst')}</p>}
            {start.isError && !demo && (
              <p role="alert" className="text-center text-gap">
                {tc('error')}
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
