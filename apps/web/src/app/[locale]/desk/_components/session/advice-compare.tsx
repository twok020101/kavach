'use client';

import type { BranchResult } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { CountOnce } from './count-once';
import { savingPair } from './labels';

/**
 * Kavach's room advice under the bill (Stitch Priya variant). It follows the engine's own
 * comparison, so the screen carries one saving: the room the engine measures its saving from
 * (the costliest for the family) against the room it recommends, each named, and the engine's
 * `saving`, counted up on first reveal.
 */
export function AdviceCompare({ result }: { result: BranchResult }) {
  const t = useTranslations('desk.session.advice');
  const { pick, costliest } = savingPair(result);
  if (!pick || !costliest) return null;
  const same = pick.roomCategoryId === costliest.roomCategoryId || result.saving <= 0;

  return (
    <section
      aria-labelledby="advice-title"
      className="desk-advice rise-in flex flex-col gap-4 rounded-xl border border-safe/25 p-5 shadow-1"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="advice-title" className="label text-safe">
            {t('eyebrow')}
          </h3>
          <p className="mt-1 text-sm text-text">
            {same
              ? t('same', { room: pick.label })
              : t('lead', { from: costliest.label, to: pick.label })}
          </p>
        </div>
        {!same && (
          <div className="shrink-0 sm:border-l sm:border-safe/20 sm:pl-5 sm:text-right">
            <p className="text-xs font-medium text-muted">{t('saves')}</p>
            <CountOnce
              value={result.saving}
              delay={250}
              className="font-display text-3xl font-extrabold text-safe"
            />
          </div>
        )}
      </div>
      {!same && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
              <Icon name="close" className="text-sm text-gap" />
              {t('without')}
            </p>
            <Amount
              value={costliest.outOfPocket}
              className="mt-1 block font-display text-xl font-bold text-gap"
            />
            <p className="text-xs text-muted">{t('oop', { room: costliest.label })}</p>
          </div>
          <div className="rounded-lg border-2 border-safe/40 bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-safe">
              <Icon name="check_circle" fill className="text-sm" />
              {t('with')}
            </p>
            <Amount
              value={pick.outOfPocket}
              className="mt-1 block font-display text-xl font-bold text-text"
            />
            <p className="text-xs text-muted">{t('oop', { room: pick.label })}</p>
          </div>
        </div>
      )}
    </section>
  );
}
