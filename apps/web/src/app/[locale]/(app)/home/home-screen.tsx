'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import {
  ArrowRight,
  Briefcase,
  PenLine,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldHalf,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Reveal } from '@/components/kavach/reveal';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/cn';
import { CellDetail } from '@/components/plan/cell-detail';
import { CoverGrid } from '@/components/plan/cover-grid';
import { DateScrubber } from '@/components/plan/date-scrubber';
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

function Home({ household }: { household: Household }) {
  const t = useTranslations('plan.home');
  const tp = useTranslations('plan');
  const date = useDate();
  const today = household.asOf ?? new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const [debounced, setDebounced] = useState(today);
  const [selected, setSelected] = useState<CoverCell>();
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

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t('hello', { name: owner?.name.split(' ')[0] ?? household.name })}
          </h1>
          <p className="mt-1 text-muted">{t('asOf', { date: date(asOf, true) })}</p>
        </div>
        {household.isDemo && (
          <div className="flex items-center gap-1 rounded-md border border-border py-1 pl-3 pr-1 text-sm font-medium text-accent-ink dark:text-text">
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

      {/* Phone: one column. Desktop: the map on the left, score and next steps on the right. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {plan && (
          <Reveal className="lg:col-start-2 lg:row-start-1">
            <Card className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={plan.coverMap.score} />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted">
                    {t('score')}
                  </span>
                  <span className="font-display text-xl font-bold leading-snug">
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
          <Reveal delay={0.05} className="lg:col-start-2">
            {drafts.length > 0 ? (
              <Link href="/actions" className="block">
                <Card interactive className="panel panel-partial flex items-center gap-3 border-0">
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
                <Card interactive className="panel flex items-center gap-3 border-0">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <ArrowRight aria-hidden className="size-5" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">
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

        <Reveal className="lg:col-start-1 lg:row-span-4 lg:row-start-1">
          <Card className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold">{t('mapTitle')}</h2>
              {onJob > 0 && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-partial-bg px-2.5 py-1 text-xs font-semibold text-partial">
                  <Briefcase aria-hidden className="size-3.5" />
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
            <p className="text-xs text-muted">{t('tapHint')}</p>
          </Card>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-start-2">
          <Link
            href="/change"
            className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'w-full' })}
          >
            <Plus aria-hidden className="size-5" />
            {t('whatsChanging')}
          </Link>
        </Reveal>
      </div>

      <Sheet
        open={!!selected}
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
  return (
    <div className={cn('flex flex-col items-center gap-0.5 rounded-md px-2 py-2', tones[tone])}>
      <dt className="flex items-center gap-1 text-xs font-semibold">
        <Icon aria-hidden className="size-4" />
        {label}
      </dt>
      <dd className="font-display text-2xl font-bold tabular-nums">{n}</dd>
    </div>
  );
}
