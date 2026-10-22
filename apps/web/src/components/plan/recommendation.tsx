'use client';

import type { Household, Plan, Recommendation } from '@kavach/schemas';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import type { Pin } from './date-scrubber';

const ICONS: Record<Recommendation['category'], string> = {
  term_life: 'group',
  family_health: 'favorite',
  parents_health: 'health_and_safety',
  personal_accident: 'personal_injury',
  device: 'smartphone',
};

/** Cover that replaces income or pays hospital bills reads green under its figure (Stitch). */
const KEY_COVER: Recommendation['category'][] = ['term_life', 'family_health', 'parents_health'];

/** "Term life for Rahul", "Parents' own health", "Phone protection (iPhone)". */
export function useRecommendationTitle(household: Household) {
  const t = useTranslations('plan.rec');
  const names = (ids: string[]) =>
    ids.map((id) => household.members.find((m) => m.id === id)?.name ?? id).join(', ');
  return (r: Recommendation) =>
    t(`title.${r.category}`, { names: names(r.memberIds), asset: r.assetLabel ?? '' });
}

/**
 * One plan item as a Stitch plan card: a numbered icon tile, the title with the monthly premium
 * and the Illustrative chip under it, the cover as the big figure on the right with what it is
 * for under it, and a chevron when it opens. Deferred items sit on a tinted card with the reason
 * in a note. On a phone the figure drops under the title so neither has to squeeze.
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
  const deferred = rec.status === 'deferred';
  const className = clsx(
    'group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-lg border p-5 text-left shadow-1 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:p-6',
    deferred
      ? 'items-start border-transparent bg-surface-container-low'
      : 'items-center border-border/60 bg-surface',
    // Added and removed items (S19): the sign badge on the tile says which; the border only echoes it.
    sign === '+' && 'border-safe',
    sign === '−' && 'border-border-strong opacity-80',
    onSelect && 'lift press cursor-pointer hover:border-primary/40',
  );
  const content = (
    <>
      <span
        className={clsx(
          'relative row-span-2 flex size-11 shrink-0 items-center justify-center self-start rounded-md transition-colors sm:row-span-1',
          deferred
            ? 'bg-surface text-on-surface-variant shadow-1 group-hover:text-primary'
            : 'bg-surface-container-low text-primary group-hover:bg-primary-container group-hover:text-on-primary-container sm:self-center',
        )}
      >
        <Icon
          name={ICONS[rec.category]}
          fill={rec.category === 'family_health'}
          className="text-[22px]"
        />
        {index !== undefined && (
          <span className="absolute -left-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary font-display text-[11px] font-bold text-on-primary ring-2 ring-surface">
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
      <div className="col-start-2 flex min-w-0 flex-col gap-1">
        <span className="font-display text-title-md text-on-surface transition-colors group-hover:text-primary">
          {title(rec)}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-body-md text-on-surface-variant">
            {t.rich('perMonth', { amount: () => <Amount value={rec.premiumMonthly} /> })}
          </span>
          {rec.via === 'migration' && (
            <>
              <span aria-hidden className="text-on-surface-variant/50">
                •
              </span>
              <span className="text-body-sm text-on-surface-variant">
                {t('viaMigration', { employer: rec.employer ?? '' })}
              </span>
            </>
          )}
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-label-caps text-on-surface-variant',
              deferred ? 'bg-surface-container' : 'bg-surface-container-low',
            )}
          >
            {t('illustrative')}
          </span>
        </div>
        {deferred && rec.deferReason && (
          <p className="mt-1.5 flex max-w-xl items-start gap-1.5 rounded-md bg-partial-bg p-2.5 font-serif text-citation-sm text-partial">
            <Icon name="info" className="mt-px text-base text-secondary" />
            {t(`defer.${rec.deferReason}`, { employer: rec.employer ?? '' })}
          </p>
        )}
      </div>
      <span
        className={clsx(
          'col-start-2 row-start-2 flex flex-col items-start sm:col-start-3 sm:row-start-1 sm:items-end',
          deferred && 'sm:pt-0.5',
        )}
      >
        <Amount
          value={rec.cover}
          className="font-display text-[1.375rem] font-bold leading-tight tracking-tight text-on-surface sm:text-numeral-lg"
        />
        {/* What the cover is for, under the figure (from the Stitch plan rows). */}
        <span
          className={clsx(
            'max-w-72 text-body-sm sm:text-right',
            !deferred && KEY_COVER.includes(rec.category)
              ? 'font-medium text-safe'
              : 'text-on-surface-variant',
          )}
        >
          {t(`purpose.${rec.category}`)}
        </span>
      </span>
      {onSelect && (
        <Icon
          name="chevron_right"
          className={clsx(
            'nudge col-start-3 row-span-2 text-2xl text-outline group-hover:text-primary sm:col-start-4 sm:row-span-1',
            deferred ? 'self-start sm:mt-1.5' : 'self-center',
          )}
        />
      )}
    </>
  );
  // Numbered rows rise in turn inside a `.stagger` list.
  const style = index !== undefined ? ({ '--i': index } as CSSProperties) : undefined;
  return onSelect ? (
    <li style={style}>
      <button type="button" onClick={onSelect} className={className}>
        {content}
      </button>
    </li>
  ) : (
    <li className={className} style={style}>
      {content}
    </li>
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
