'use client';

import type { Household, Plan, Recommendation } from '@kavach/schemas';
import {
  Bandage,
  ChevronRight,
  HeartPulse,
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
  const Icon = ICONS[rec.category];
  const deferred = rec.status === 'deferred';
  const className = cn(
    'flex items-center gap-3 rounded-md border border-border bg-surface p-3 sm:p-4',
    sign === '+' && 'border-l-4 border-l-safe',
    sign === '−' && 'border-l-4 border-l-border-strong opacity-80',
    deferred && 'bg-sunken shadow-none',
    onSelect && 'press w-full text-left hover:border-primary',
  );
  const content = (
    <>
      <span
        className={cn(
          'relative flex size-11 shrink-0 items-center justify-center rounded-full',
          deferred ? 'bg-surface text-muted' : 'bg-primary-soft text-primary',
        )}
      >
        <Icon aria-hidden className="size-5" />
        {index !== undefined && (
          <span className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary font-display text-[11px] font-bold text-on-primary">
            {index}
          </span>
        )}
        {sign && (
          <span
            aria-hidden
            className="absolute -left-1 -top-1 flex size-5 items-center justify-center rounded-full bg-text text-xs font-bold text-bg"
          >
            {sign}
          </span>
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold leading-snug">{title(rec)}</span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span>{t.rich('perMonth', { amount: () => <Amount value={rec.premiumMonthly} /> })}</span>
          {rec.via === 'migration' && (
            <span>· {t('viaMigration', { employer: rec.employer ?? '' })}</span>
          )}
          <Badge tone="neutral" className="text-xs">
            {t('illustrative')}
          </Badge>
        </div>
        {deferred && rec.deferReason && (
          <p className="text-sm text-partial">
            {t(`defer.${rec.deferReason}`, { employer: rec.employer ?? '' })}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Amount value={rec.cover} className="font-display text-base font-bold sm:text-lg" />
        {onSelect && <ChevronRight aria-hidden className="size-5 text-muted" />}
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
