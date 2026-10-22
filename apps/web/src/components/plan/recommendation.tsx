'use client';

import type { Household, Plan, Recommendation } from '@kavach/schemas';
import {
  Bandage,
  ChevronRight,
  HeartPulse,
  Info,
  type LucideIcon,
  Smartphone,
  Users,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/components/ui/cn';
import type { Pin } from './date-scrubber';

const ICONS: Record<Recommendation['category'], LucideIcon> = {
  term_life: Users,
  family_health: HeartPulse,
  parents_health: HeartPulse,
  personal_accident: Bandage,
  device: Smartphone,
};

/** "Term life for Rahul", "Parents' own health", "Phone protection (iPhone)". */
export function useRecommendationTitle(household: Household) {
  const t = useTranslations('plan.rec');
  const names = (ids: string[]) =>
    ids.map((id) => household.members.find((m) => m.id === id)?.name ?? id).join(', ');
  return (r: Recommendation) =>
    t(`title.${r.category}`, { names: names(r.memberIds), asset: r.assetLabel ?? '' });
}

/**
 * One plan item, laid out like the Stitch plan card: a numbered icon tile, the title with the
 * monthly premium and the Illustrative chip under it, the cover as the big figure on the right
 * with what it is for under it, and a chevron when it opens. On a phone the figure drops under
 * the title so neither has to squeeze. Why it waits, if it does.
 */
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
  const Icon = ICONS[rec.category];
  const deferred = rec.status === 'deferred';
  const className = cn(
    'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md border border-border bg-surface p-4 shadow-1 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-5 sm:p-6',
    // Added and removed items (S19): the sign badge on the tile says which; the border only echoes it.
    sign === '+' && 'border-safe',
    sign === '−' && 'border-border-strong opacity-80',
    deferred && 'items-start',
    onSelect && 'press w-full text-left hover:border-primary',
  );
  const content = (
    <>
      <span
        className={cn(
          'relative row-span-2 flex size-12 shrink-0 items-center justify-center self-start rounded-md sm:row-span-1',
          deferred ? 'bg-sunken text-muted' : 'bg-primary-soft text-primary sm:self-center',
        )}
      >
        <Icon aria-hidden className="size-6" strokeWidth={1.75} />
        {index !== undefined && (
          <span className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-display text-[11px] font-bold text-on-primary">
            {index}
          </span>
        )}
        {sign && (
          <span
            aria-hidden
            className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-text text-xs font-bold text-bg"
          >
            {sign}
          </span>
        )}
      </span>
      <div className="col-start-2 flex min-w-0 flex-col gap-0.5">
        <span className="font-display font-semibold leading-snug">{title(rec)}</span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{t.rich('perMonth', { amount: () => <Amount value={rec.premiumMonthly} /> })}</span>
          {rec.via === 'migration' && (
            <span className="basis-full">
              {t('viaMigration', { employer: rec.employer ?? '' })}
            </span>
          )}
          <Badge tone="neutral" className="text-xs">
            {t('illustrative')}
          </Badge>
        </div>
        {deferred && rec.deferReason && (
          <p className="panel panel-partial mt-1.5 flex items-start gap-1.5 text-sm text-partial">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
            {t(`defer.${rec.deferReason}`, { employer: rec.employer ?? '' })}
          </p>
        )}
      </div>
      <span
        className={cn(
          'col-start-2 row-start-2 flex flex-col items-start sm:col-start-3 sm:row-start-1 sm:items-end',
          deferred && 'sm:self-center',
        )}
      >
        <Amount
          value={rec.cover}
          className="font-display text-xl font-bold tracking-tight sm:text-2xl"
        />
        {/* What the cover is for, under the figure (from the Stitch plan rows). */}
        <span
          className={cn(
            'max-w-56 text-xs leading-tight sm:text-right',
            deferred ? 'text-muted' : 'font-medium text-safe',
          )}
        >
          {t(`purpose.${rec.category}`)}
        </span>
      </span>
      {onSelect && (
        <ChevronRight
          aria-hidden
          className="col-start-3 row-span-2 size-5 self-center text-muted sm:col-start-4 sm:row-span-1"
        />
      )}
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
