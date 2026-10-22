'use client';

import type { Action, Household } from '@kavach/schemas';
import { ArrowRight, BellRing, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ListSkeleton, pageTitle, QueryError } from '@/components/app/page-parts';
import { Amount } from '@/components/kavach/amount';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CoverGrid } from '@/components/plan/cover-grid';
import { useDate } from '@/components/plan/format';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useActions, useLifeChange } from '@/components/plan/queries';
import { RecommendationRow } from '@/components/plan/recommendation';
import { ScoreRing } from '@/components/plan/score-ring';
import { Link } from '@/i18n/navigation';

export function ReplanScreen({ id }: { id: string }) {
  return <PlanFrame>{(household) => <Replan household={household} id={id} />}</PlanFrame>;
}

function Replan({ household, id }: { household: Household; id: string }) {
  const t = useTranslations('plan.replan');
  const date = useDate();
  const tp = useTranslations('plan');
  const { data: record, error, refetch } = useLifeChange(household.id, id);
  const { data: actions = [] } = useActions(household.id);
  // The map starts as things stand today and glides to the day the change takes effect.
  const [played, setPlayed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPlayed(true), 900);
    return () => clearTimeout(timer);
  }, []);

  if (error && !record) {
    return (
      <QueryError message={t('notFound')} retryLabel={tp('retry')} onRetry={() => refetch()} />
    );
  }
  if (!record) return <ListSkeleton rows={3} rowClassName="h-32" label={tp('loading')} />;

  const { diff, before, after, changeSet } = record;
  const lost = diff.cellsChanged.filter((c) => c.after === 'gap').map((c) => c.memberId);
  const names = household.members.filter((m) => lost.includes(m.id)).map((m) => m.name);
  const mine = actions.filter((a) => record.actionIds.includes(a.id));
  const fits = diff.monthlySpend.after <= diff.budgetForNew.after;

  return (
    <div className="flex flex-col gap-5">
      <h1 className={pageTitle}>
        {names.length
          ? t('headline', { date: date(changeSet.effectiveDate), names: names.join(' & ') })
          : t('headlineNone', { date: date(changeSet.effectiveDate) })}
      </h1>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className={played ? 'text-muted' : 'text-primary'}>{date(before.asOf)}</span>
          <div className="mx-2 h-1 flex-1 rounded-full bg-sunken">
            <div
              className="h-1 rounded-sm bg-primary transition-[width] duration-600 ease-[var(--ease-out-strong)]"
              style={{ width: played ? '100%' : '0%' }}
            />
          </div>
          <span className={played ? 'text-primary' : 'text-muted'}>{date(after.asOf)}</span>
        </div>
        <CoverGrid
          household={household}
          map={played ? after.coverMap : before.coverMap}
          risks={['health']}
          pulseGaps={played}
        />
        <div className="flex items-center gap-3">
          <ScoreRing score={played ? diff.score.after : diff.score.before} size={56} />
          <span className="text-sm text-muted">
            {t('score', { before: diff.score.before, after: diff.score.after })}
          </span>
        </div>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{t('newPlan')}</h2>
        <ul className="flex flex-col gap-2">
          {diff.added.map((r) => (
            <RecommendationRow key={r.id} household={household} rec={r} sign="+" />
          ))}
          {diff.removed.map((r) => (
            <RecommendationRow key={r.id} household={household} rec={r} sign="−" />
          ))}
        </ul>
        <p className="font-semibold">
          {t.rich('spend', {
            before: () => <Amount value={diff.monthlySpend.before} />,
            after: () => <Amount value={diff.monthlySpend.after} />,
          })}{' '}
          {fits && <Badge tone="safe">{t('fits')}</Badge>}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{t('steps')}</h2>
        <ul className="flex flex-col gap-2">
          {mine.map((a) => (
            <ActionRow key={a.id} action={a} />
          ))}
        </ul>
        <p className="text-sm text-muted">{t('checkHr')}</p>
      </section>
    </div>
  );
}

function ActionRow({ action }: { action: Action }) {
  const t = useTranslations('plan.replan');
  const date = useDate();
  const Icon = action.kind === 'reminder' ? BellRing : FileText;
  return (
    <li>
      <Link href={`/actions/${action.id}`} className="block">
        <Card className="flex items-center gap-3 p-3 hover:border-primary sm:p-3">
          <span className="flex w-14 shrink-0 flex-col items-center rounded-md bg-primary-soft py-1 text-primary">
            <span className="text-xs">{t('by')}</span>
            <span className="text-sm font-bold">{action.dueDate ? date(action.dueDate) : '–'}</span>
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-semibold">{action.title}</span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <Icon aria-hidden className="size-4" />
              {t(`kind.${action.kind}`)} · {t(`status.${action.status}`)}
            </span>
          </span>
          <ArrowRight aria-hidden className="size-5 text-primary" />
        </Card>
      </Link>
    </li>
  );
}
