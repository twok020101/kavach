'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type CSSProperties } from 'react';
import { ListSkeleton, QueryError } from '@/components/app/page-parts';
import { Icon } from '@/components/kavach/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/components/ui/cn';
import { CellDetail } from '@/components/plan/cell-detail';
import { CoverGrid } from '@/components/plan/cover-grid';
import { DateScrubber } from '@/components/plan/date-scrubber';
import {
  ComingUp,
  Greeting,
  homeCard,
  NextCard,
  QuickActions,
  ReadyPanel,
  ScoreCard,
} from '@/components/plan/home-extras';
import { MemberHome } from '@/components/plan/member-home';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useActions, usePlan } from '@/components/plan/queries';
import { usePins } from '@/components/plan/recommendation';
import { Sheet } from '@/components/plan/sheet';
import { StatusPill } from '@/components/plan/status-pill';
import { useDate } from '@/components/plan/format';
import { useDemoControls } from '@/lib/household';
import { useStoredMemberId } from '@/lib/session';
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

const rise = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * S09 Home for the owner, after the Stitch dashboard: the greeting and the demo clock; on the
 * left the cover map over time with the chosen cell's inspector under it and three things to do;
 * on the right the safety score, the next step, the next dates and what Kavach will say first if
 * someone is admitted tonight. Phone: one column, score first, the cell opens in a sheet.
 */
function Home({ household }: { household: Household }) {
  const t = useTranslations('plan.home');
  const tp = useTranslations('plan');
  const tc = useTranslations('common');
  const ts = useTranslations('plan.scrubber');
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
  const {
    data: plan,
    isFetching,
    isError: planFailed,
    refetch: refetchPlan,
  } = usePlan(household.id, debounced === today ? undefined : debounced);
  const { data: actions = [] } = useActions(household.id);
  const pins = usePins(household, todayPlan);
  const { reset } = useDemoControls(household.id);
  const drafts = actions.filter((a) => a.status === 'draft');
  const member = (id: string) =>
    household.members.find((m) => m.id === id)?.name.split(' ')[0] ?? id;

  const cells = (plan?.coverMap.cells ?? []).filter((c) => c.status !== 'na');
  const count = (s: CoverCell['status']) => cells.filter((c) => c.status === s).length;
  const gaps = count('gap');
  const onJob = count('contingent');
  const covered = count('covered');
  const partial = count('partial') + onJob;
  const owner = household.members.find((m) => m.relation === 'self');
  const earner = owner?.name.split(' ')[0] ?? '';
  const selectedCount = plan?.recommendations.filter((r) => r.status === 'selected').length ?? 0;
  // The inspector follows the scrubbed map: the same cell, as of the chosen date.
  const shownCell =
    selected &&
    (plan?.coverMap.cells.find(
      (c) => c.memberId === selected.memberId && c.risk === selected.risk,
    ) ??
      selected);

  const summary = plan ? (
    <>
      <ScoreCard
        score={plan.coverMap.score}
        covered={covered}
        partial={partial}
        gaps={gaps}
        onJob={onJob}
        earner={earner}
      />
      <NextCard drafts={drafts.length} steps={selectedCount} monthly={plan.monthlySpend} />
    </>
  ) : planFailed ? null : (
    // The score and the next step hold their place while the plan loads.
    <>
      <Skeleton className="h-52 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="rise-in flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Greeting household={household} needs={drafts.length} asOf={today} />
        {household.isDemo && (
          // The demo clock (Stitch): a tinted card with the date and the way back to the start.
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 self-start rounded-lg border border-outline-variant/30 bg-surface-container-low py-1 pl-4 pr-1 shadow-1 md:self-auto">
            <span className="flex items-center gap-2 text-body-sm text-on-surface">
              <Icon name="calendar_today" className="text-lg text-primary" />
              <span>
                {t.rich('demoDate', {
                  date: date(today, true),
                  b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
                })}
              </span>
            </span>
            <button
              type="button"
              disabled={reset.isPending}
              onClick={() => {
                setAsOf(today);
                setSelected(undefined);
                reset.mutate('setup', { onSuccess: (h) => setAsOf(h.asOf ?? today) });
              }}
              className="press flex min-h-12 items-center gap-1.5 rounded-md px-3 font-display text-body-sm font-semibold text-primary transition-colors hover:bg-surface-container disabled:opacity-60"
            >
              {reset.isPending ? (
                <Spinner className="size-4" />
              ) : (
                <Icon name="restart_alt" className="text-base" />
              )}
              {t('startStory')}
            </button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: the map, the inspector, three things to do. */}
        <div className="stagger flex min-w-0 flex-col gap-6 lg:col-span-8">
          {/* Phone: the score and the next step come first. */}
          {summary && (
            <div className="flex flex-col gap-4 lg:hidden" style={rise(0)}>
              {summary}
            </div>
          )}

          <section aria-labelledby="map-title" className={cn(homeCard, 'relative')} style={rise(1)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id="map-title" className="font-display text-headline-sm text-on-surface">
                  {t('mapTitle')}
                </h2>
                <div className="flex flex-wrap items-center gap-x-2">
                  <label
                    htmlFor="as-of"
                    className="flex items-center gap-1.5 text-body-sm text-on-surface-variant"
                  >
                    <Icon name="event_note" className="text-lg text-primary" />
                    {ts('asOf', { date: date(asOf, true) })}
                  </label>
                  {isFetching && <Spinner className="size-3.5 text-primary" />}
                  {asOf !== today && (
                    <button
                      type="button"
                      onClick={() => setAsOf(today)}
                      className="press -my-2 flex min-h-12 items-center gap-1 rounded-md px-2 text-body-sm font-semibold text-primary hover:bg-surface-container-low"
                    >
                      <Icon name="undo" className="text-base" />
                      {ts('today')}
                    </button>
                  )}
                </div>
              </div>
              {onJob > 0 && (
                <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-secondary-container/50 bg-partial-bg px-3 py-1 text-body-sm font-semibold text-partial">
                  <Icon name="business_center" className="text-base" />
                  {t('onJob', { count: onJob, name: earner })}
                </span>
              )}
            </div>
            <div className="mt-3">
              <DateScrubber
                from={today}
                days={SCRUB_DAYS}
                value={asOf}
                pins={pins}
                onChange={setAsOf}
              />
            </div>
            {plan ? (
              <div
                aria-busy={isFetching}
                className={cn('mt-2 transition-opacity', isFetching && 'opacity-60')}
              >
                <CoverGrid
                  household={household}
                  map={plan.coverMap}
                  selected={selected}
                  onSelect={setSelected}
                />
              </div>
            ) : planFailed ? (
              <QueryError
                className="mt-3"
                message={tp('error')}
                retryLabel={tp('retry')}
                onRetry={() => refetchPlan()}
              />
            ) : (
              <ListSkeleton
                rows={household.members.length}
                rowClassName="h-14"
                className="mt-3"
                label={tp('loading')}
              />
            )}
            <p className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 font-serif text-citation-sm text-on-surface-variant">
              <span>{t('tapHint')}</span>
              <Icon name="touch_app" className="text-base" />
            </p>
          </section>

          {shownCell && desktop && (
            // Shown at once (no scroll reveal): the person just tapped the cell and is looking here.
            <section
              key={shownCell.memberId + shownCell.risk}
              aria-labelledby="cell-title"
              className="inspector-in flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-2"
            >
              <div className="flex items-start justify-between gap-3">
                {/* Title and status on one line (Stitch inspector header). */}
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 id="cell-title" className="font-display text-headline-sm text-on-surface">
                    {t('cellTitle', {
                      name: member(shownCell.memberId),
                      risk: tp(`risk.${shownCell.risk}`),
                    })}
                  </h2>
                  <StatusPill status={shownCell.status} size="sm" />
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(undefined)}
                  aria-label={tc('close')}
                  className="press -mr-3 -mt-3 flex size-12 shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low"
                >
                  <Icon name="close" className="text-xl" />
                </button>
              </div>
              <CellDetail household={household} cell={shownCell} showStatus={false} />
            </section>
          )}

          <QuickActions household={household} className="hidden lg:block" />
        </div>

        {/* Right rail. */}
        <div className="stagger flex min-w-0 flex-col gap-6 lg:col-span-4">
          {summary && (
            <div className="hidden flex-col gap-6 lg:flex" style={rise(2)}>
              {summary}
            </div>
          )}
          {/* The dates come from the plan: no "nothing coming up" before it has loaded. */}
          {todayPlan ? (
            <div style={rise(3)}>
              <ComingUp pins={pins} from={today} />
            </div>
          ) : (
            !planFailed && <Skeleton className="h-40 rounded-lg" />
          )}
          <div style={rise(4)}>
            <ReadyPanel household={household} asOf={today} />
          </div>
        </div>
      </div>

      <QuickActions household={household} className="lg:hidden" />

      <Sheet
        open={!!shownCell && !desktop}
        onClose={() => setSelected(undefined)}
        title={
          shownCell
            ? t('cellTitle', {
                name: member(shownCell.memberId),
                risk: tp(`risk.${shownCell.risk}`),
              })
            : ''
        }
      >
        {shownCell && <CellDetail household={household} cell={shownCell} />}
      </Sheet>
    </div>
  );
}
