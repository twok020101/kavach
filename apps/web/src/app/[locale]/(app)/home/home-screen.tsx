'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  PenLine,
  Pointer,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Reveal } from '@/components/kavach/reveal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/cn';
import { StatusBadge } from '@/components/ui/status-badge';
import { CellDetail } from '@/components/plan/cell-detail';
import { CoverGrid } from '@/components/plan/cover-grid';
import { DateScrubber } from '@/components/plan/date-scrubber';
import { ComingUp, Greeting, QuickActions, ReadyPanel } from '@/components/plan/home-extras';
import { MemberHome } from '@/components/plan/member-home';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useActions, usePlan } from '@/components/plan/queries';
import { usePins } from '@/components/plan/recommendation';
import { ScoreRing } from '@/components/plan/score-ring';
import { Sheet } from '@/components/plan/sheet';
import { useDate } from '@/components/plan/format';
import { Link } from '@/i18n/navigation';
import { useDemoControls } from '@/lib/household';
import { useStoredMemberId } from '@/lib/session';
import { useCountUp } from '@/lib/use-count-up';
import { useDesktop } from '@/lib/use-media';

const SCRUB_DAYS = 180;

export function HomeScreen() {
  return <PlanFrame>{(household) => <HomeOrMember household={household} />}</PlanFrame>;
}

/** A device that joined through an invite (Kamala's phone) gets the simple home (S09m). */
function HomeOrMember({ household }: { household: Household }) {
  const [full, setFull] = useState(false);
  const memberId = useStoredMemberId();
  const member = household.members.find((m) => m.id === memberId && m.relation !== 'self');
  if (member && !full) {
    return <MemberHome household={household} member={member} onFullView={() => setFull(true)} />;
  }
  return <Home household={household} />;
}

/**
 * S09 Home for the owner: a greeting that knows the hour, what needs them, the safety score, the
 * cover map over time, the next dates, three plain things to do, and what Kavach will say first
 * if someone is admitted tonight. Phone: one column. Desktop: the map left, the rest right.
 */
function Home({ household }: { household: Household }) {
  const t = useTranslations('plan.home');
  const tp = useTranslations('plan');
  const tc = useTranslations('common');
  const date = useDate();
  const today = household.asOf ?? new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const [debounced, setDebounced] = useState(today);
  const [selected, setSelected] = useState<CoverCell>();
  // On a laptop the chosen cell opens in place under the map; on a phone it is a sheet.
  const desktop = useDesktop();
  useEffect(() => {
    const id = setTimeout(() => setDebounced(asOf), 250);
    return () => clearTimeout(id);
  }, [asOf]);

  const { data: todayPlan } = usePlan(household.id);
  const { data: plan, isFetching } = usePlan(
    household.id,
    debounced === today ? undefined : debounced,
  );
  const { data: actions = [] } = useActions(household.id);
  const pins = usePins(household, todayPlan);
  const { reset } = useDemoControls(household.id);
  const drafts = actions.filter((a) => a.status === 'draft');
  const member = (id: string) => household.members.find((m) => m.id === id)?.name ?? id;

  const cells = (plan?.coverMap.cells ?? []).filter((c) => c.status !== 'na');
  const count = (s: CoverCell['status']) => cells.filter((c) => c.status === s).length;
  const gaps = count('gap');
  const onJob = count('contingent');
  const covered = count('covered');
  const partial = count('partial') + onJob;
  const owner = household.members.find((m) => m.relation === 'self');
  const earner = owner?.name ?? '';
  const selectedCount = plan?.recommendations.filter((r) => r.status === 'selected').length ?? 0;
  const score = plan?.coverMap.score ?? 0;
  const scoreWord = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <Greeting household={household} needs={drafts.length} asOf={today} />
        {household.isDemo && (
          // The demo clock as a quiet soft-indigo card (Stitch 06), not a bordered pill.
          <div className="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-primary-soft py-1.5 pl-3 pr-1.5 text-sm font-medium">
            <CalendarDays aria-hidden className="size-4 shrink-0 text-primary-hover" />
            <span>{t('demoDate', { date: date(today, true) })}</span>
            <Button
              variant="ghost"
              size="sm"
              className="min-h-9 px-2.5 text-sm"
              loading={reset.isPending}
              onClick={() => {
                setAsOf(today);
                reset.mutate('setup', { onSuccess: (h) => setAsOf(h.asOf ?? today) });
              }}
            >
              <RotateCcw aria-hidden className="size-4" />
              {t('startStory')}
            </Button>
          </div>
        )}
      </header>

      {/* Phone: one column, score first (the `order-*` classes). Laptop: two columns (Stitch
          home): the map, the chosen cell and the three things to do on the left; score, next
          step, dates and the emergency card on the right. The wrappers are `contents` on a
          phone so their children join one column. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
          <Reveal className="order-3 lg:order-none">
            <Card className="flex flex-col gap-4 shadow-1 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                <h2 className="font-display text-xl font-semibold">{t('mapTitle')}</h2>
                {onJob > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-partial/30 bg-partial-bg px-3 py-1 text-sm font-semibold text-partial">
                    <Briefcase aria-hidden className="size-4 shrink-0" />
                    {t('onJob', { count: onJob, name: earner })}
                  </span>
                )}
              </div>
              <DateScrubber
                from={today}
                days={SCRUB_DAYS}
                value={asOf}
                pins={pins}
                onChange={setAsOf}
              />
              {plan && (
                <div
                  aria-busy={isFetching}
                  className={cn('transition-opacity', isFetching && 'opacity-60')}
                >
                  <CoverGrid household={household} map={plan.coverMap} onSelect={setSelected} />
                </div>
              )}
              <p className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm text-muted">
                <span className="serif">{t('tapHint')}</span>
                <Pointer aria-hidden className="size-4 shrink-0" />
              </p>
            </Card>
          </Reveal>

          {selected && desktop && (
            // Shown at once (no scroll reveal): the person just tapped the cell and is looking here.
            <div key={selected.memberId + selected.risk}>
              <Card
                as="section"
                aria-labelledby="cell-title"
                className="flex flex-col gap-4 shadow-2 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Title and status on one line (Stitch inspector header). */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 id="cell-title" className="font-display text-xl font-semibold">
                      {t('cellTitle', {
                        name: member(selected.memberId),
                        risk: tp(`risk.${selected.risk}`),
                      })}
                    </h2>
                    <StatusBadge
                      status={selected.status}
                      className="rounded-full border border-current/25 px-2.5 text-xs font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(undefined)}
                    aria-label={tc('close')}
                    className="press -mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken"
                  >
                    <X aria-hidden className="size-5" />
                  </button>
                </div>
                <CellDetail household={household} cell={selected} showStatus={false} />
              </Card>
            </div>
          )}

          <Reveal delay={0.1} className="order-6 lg:order-none">
            <QuickActions household={household} />
          </Reveal>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-6">
          {plan && (
            <Reveal className="order-1 lg:order-none">
              <Card className="flex flex-col gap-4 shadow-1 sm:p-6">
                <div className="flex items-center gap-4">
                  <ScoreRing score={plan.coverMap.score} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="label-caps">{t('score')}</span>
                    <span className="font-display text-xl font-semibold leading-snug">
                      {t(`scoreWord.${scoreWord}`)}
                    </span>
                    <span className="serif text-sm text-muted">
                      {t('summary', { gaps, onJob, name: earner })}
                    </span>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <Stat icon={ShieldCheck} tone="safe" n={covered} label={t('stats.covered')} />
                  <Stat icon={ShieldHalf} tone="partial" n={partial} label={t('stats.partial')} />
                  <Stat icon={ShieldAlert} tone="gap" n={gaps} label={t('stats.gaps')} />
                </dl>
              </Card>
            </Reveal>
          )}

          {plan && (drafts.length > 0 || selectedCount > 0) && (
            <Reveal delay={0.05} className="order-2 lg:order-none">
              {drafts.length > 0 ? (
                <Link href="/actions" className="block">
                  <Card
                    interactive
                    className="panel panel-partial flex items-center gap-3 border-0 shadow-1"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-partial-bg text-partial">
                      <PenLine aria-hidden className="size-5" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="font-semibold">{t('drafts', { count: drafts.length })}</span>
                      <span className="text-sm text-muted">{t('draftsHint')}</span>
                    </span>
                    <ArrowRight aria-hidden className="size-5 text-primary" />
                  </Card>
                </Link>
              ) : (
                <Link href="/plan" className="block">
                  <Card interactive className="flex items-center gap-3 shadow-1 sm:p-6">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <ArrowRight aria-hidden className="size-5" />
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="font-display text-lg font-semibold leading-snug">
                        {t.rich('next', {
                          count: selectedCount,
                          amount: () => <Amount value={plan.monthlySpend} />,
                        })}
                      </span>
                      <span className="text-sm text-muted">{t('nextHint')}</span>
                    </span>
                  </Card>
                </Link>
              )}
            </Reveal>
          )}

          <Reveal delay={0.1} className="order-4 lg:order-none">
            <ComingUp pins={pins} from={today} />
          </Reveal>

          <Reveal delay={0.15} className="order-5 lg:order-none">
            <ReadyPanel household={household} asOf={today} />
          </Reveal>
        </div>
      </div>

      <Sheet
        open={!!selected && !desktop}
        onClose={() => setSelected(undefined)}
        title={
          selected
            ? t('cellTitle', { name: member(selected.memberId), risk: tp(`risk.${selected.risk}`) })
            : ''
        }
      >
        {selected && <CellDetail household={household} cell={selected} />}
      </Sheet>
    </div>
  );
}

function Stat({
  icon: Icon,
  tone,
  n,
  label,
}: {
  icon: typeof ShieldCheck;
  tone: 'safe' | 'partial' | 'gap';
  n: number;
  label: string;
}) {
  const tones = {
    safe: 'bg-safe-bg text-safe',
    partial: 'bg-partial-bg text-partial',
    gap: 'bg-gap-bg text-gap',
  };
  const shown = useCountUp(n, 600);
  return (
    <div className={cn('flex flex-col items-center gap-0.5 rounded-md px-2 py-2', tones[tone])}>
      <dt className="flex min-w-0 flex-wrap items-center justify-center gap-1 text-center text-xs font-semibold [overflow-wrap:anywhere]">
        <Icon aria-hidden className="size-4 shrink-0" />
        {label}
      </dt>
      <dd className="font-display text-2xl font-bold tabular-nums">
        <span className="sr-only">{n}</span>
        <span aria-hidden>{shown}</span>
      </dd>
    </div>
  );
}
