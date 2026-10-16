'use client';

import type { Household, Plan, Recommendation } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/cn';
import type { Pin } from './date-scrubber';

/** "Term life for Rahul", "Parents' own health", "Phone protection (iPhone)". */
export function useRecommendationTitle(household: Household) {
  const t = useTranslations('plan.rec');
  const names = (ids: string[]) =>
    ids.map((id) => household.members.find((m) => m.id === id)?.name ?? id).join(', ');
  return (r: Recommendation) =>
    t(`title.${r.category}`, { names: names(r.memberIds), asset: r.assetLabel ?? '' });
}

/** One plan item: what, for whom, size and indicative premium; why it waits, if it does. */
export function RecommendationRow({
  household,
  rec,
  index,
  sign,
  onSelect,
}: {
  household: Household;
  rec: Recommendation;
  index?: number;
  sign?: '+' | '−';
  /** Makes the row a button that opens the item's detail (S11). */
  onSelect?: () => void;
}) {
  const t = useTranslations('plan.rec');
  const title = useRecommendationTitle(household);
  const className = cn(
    'flex gap-3 rounded-md border border-border bg-surface p-3',
    sign === '+' && 'border-l-4 border-l-safe',
    sign === '−' && 'border-l-4 border-l-border-strong opacity-80',
    onSelect && 'w-full text-left hover:border-primary',
  );
  const content = (
    <>
      {index !== undefined && (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
          {index}
        </span>
      )}
      {sign && (
        <span aria-hidden className="w-4 shrink-0 text-lg font-bold leading-6">
          {sign}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold">{title(rec)}</span>
          <Amount value={rec.cover} className="text-sm font-semibold" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{t.rich('perMonth', { amount: () => <Amount value={rec.premiumMonthly} /> })}</span>
          {rec.via === 'migration' && (
            <span>· {t('viaMigration', { employer: rec.employer ?? '' })}</span>
          )}
          <Badge tone="neutral" className="text-xs">
            {t('illustrative')}
          </Badge>
        </div>
        {rec.status === 'deferred' && rec.deferReason && (
          <p className="text-sm text-partial">
            {t(`defer.${rec.deferReason}`, { employer: rec.employer ?? '' })}
          </p>
        )}
      </div>
    </>
  );
  return onSelect ? (
    <li>
      <button type="button" onClick={onSelect} className={className}>
        {content}
      </button>
    </li>
  ) : (
    <li className={className}>{content}</li>
  );
}

/** Scrubber pins from the plan's dated events: "Acme Software cover ends", "Orbit Labs cover starts". */
export function usePins(household: Household, plan: Plan | undefined): Pin[] {
  const t = useTranslations('plan.scrubber');
  if (!plan) return [];
  return plan.events.map((e) => {
    const p = household.policies.find((p) => p.id === e.policyId);
    const name = p?.employer ?? p?.productName ?? e.policyId;
    return { date: e.date, label: t(e.kind, { name }) };
  });
}
