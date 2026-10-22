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
 * `saving`, counted up on first reveal. "Without Kavach's advice" is only said of the room the
 * estimate was quoted for; when the costliest room is another one, it is named as the costliest,
 * and the quoted room's own share is shown under the pair.
 */
export function AdviceCompare({
  result,
  quotedRoomId,
}: {
  result: BranchResult;
  /** The room the estimate was quoted for (its first room category). */
  quotedRoomId?: string;
}) {
  const t = useTranslations('desk.session.advice');
  const { pick, costliest } = savingPair(result);
  if (!pick || !costliest) return null;
  const same = pick.roomCategoryId === costliest.roomCategoryId || result.saving <= 0;
  const quotedIsCostliest = !quotedRoomId || quotedRoomId === costliest.roomCategoryId;
  const quoted = result.options.find((o) => o.roomCategoryId === quotedRoomId);
  const showQuoted = !quotedIsCostliest && quoted && quoted.roomCategoryId !== pick.roomCategoryId;

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
            <p className="text-xs font-medium text-muted">
              {quotedIsCostliest ? t('saves') : t('savesVsCostliest')}
            </p>
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
              <Icon
                name={quotedIsCostliest ? 'close' : 'trending_up'}
                className="text-sm text-gap"
              />
              {quotedIsCostliest ? t('without') : t('costliest')}
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
      {!same && showQuoted && (
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted">
          <Icon name="receipt_long" className="self-center text-sm" />
          {t('quoted', { room: quoted.label })}
          <Amount value={quoted.outOfPocket} className="font-semibold text-text" />
        </p>
      )}
    </section>
  );
}
