'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import { ArrowRight, Plus, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CellDetail } from '@/components/plan/cell-detail';
import { CoverGrid } from '@/components/plan/cover-grid';
import { DateScrubber } from '@/components/plan/date-scrubber';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useActions, usePlan } from '@/components/plan/queries';
import { usePins } from '@/components/plan/recommendation';
import { ScoreRing } from '@/components/plan/score-ring';
import { Sheet } from '@/components/plan/sheet';
import { useDate } from '@/components/plan/format';
import { Link } from '@/i18n/navigation';
import { useDemoControls } from '@/lib/household';

const SCRUB_DAYS = 180;

export function HomeScreen() {
  return <PlanFrame showHospitalButton>{(household) => <Home household={household} />}</PlanFrame>;
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

  const cells = plan?.coverMap.cells ?? [];
  const gaps = cells.filter((c) => c.status === 'gap').length;
  const onJob = cells.filter((c) => c.status === 'contingent').length;
  const earner = household.members.find((m) => m.relation === 'self')?.name ?? '';
  const selectedCount = plan?.recommendations.filter((r) => r.status === 'selected').length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {household.isDemo && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-accent/15 px-3 py-2 text-sm">
          <span>{t('demoDate', { date: date(today, true) })}</span>
          <Button
            variant="ghost"
            size="sm"
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

      {/* Phone: one column. Desktop: the map on the left, score and next steps on the right. */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {plan && (
          <Card className="flex items-center gap-4 lg:col-start-2 lg:row-start-1">
            <ScoreRing score={plan.coverMap.score} />
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold">{t('score')}</span>
              <span className="text-muted">{t('summary', { gaps, onJob, name: earner })}</span>
            </div>
          </Card>
        )}

        <Card className="flex flex-col gap-3 lg:col-start-1 lg:row-span-4 lg:row-start-1">
          <DateScrubber
            from={today}
            days={SCRUB_DAYS}
            value={asOf}
            pins={pins}
            onChange={setAsOf}
          />
          {plan && (
            <div aria-busy={isFetching} className={isFetching ? 'opacity-70' : undefined}>
              <CoverGrid household={household} map={plan.coverMap} onSelect={setSelected} />
            </div>
          )}
        </Card>

        {plan && selectedCount > 0 && (
          <Link href="/plan" className="block lg:col-start-2">
            <Card className="flex items-center gap-3 hover:border-primary">
              <div className="flex-1">
                <p className="font-semibold">
                  {t.rich('next', {
                    count: selectedCount,
                    amount: () => <Amount value={plan.monthlySpend} />,
                  })}
                </p>
                <p className="text-sm text-muted">{t('nextHint')}</p>
              </div>
              <ArrowRight aria-hidden className="size-5 text-primary" />
            </Card>
          </Link>
        )}

        {drafts.length > 0 && (
          <Link href="/actions" className="block lg:col-start-2">
            <Card className="flex items-center gap-3 border-accent hover:border-primary">
              <p className="flex-1 font-semibold">{t('drafts', { count: drafts.length })}</p>
              <ArrowRight aria-hidden className="size-5 text-primary" />
            </Card>
          </Link>
        )}

        <Link
          href="/change"
          className={buttonClasses({
            variant: 'secondary',
            size: 'lg',
            className: 'lg:col-start-2',
          })}
        >
          <Plus aria-hidden className="size-5" />
          {t('whatsChanging')}
        </Link>
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
