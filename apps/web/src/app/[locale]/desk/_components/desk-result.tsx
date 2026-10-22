'use client';

import type { DeskEvaluation } from '@kavach/schemas';
import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { RoomCompare } from '@/components/kavach/room-compare';
import { VerifiedBadge } from '@/components/kavach/verified-badge';
import { Card } from '@/components/ui/card';

/**
 * The result card of the Stitch desk: "Save {amount}" from the engine's saving, one line of
 * reason, the recommended room as a green status line, then the quoted room and the recommended
 * room side by side (every room when the estimate's own room is already the best one).
 */
export function DeskResult({
  evaluation,
  quotedRoomId,
}: {
  evaluation: DeskEvaluation;
  /** The room the estimate was quoted for (its first room category). */
  quotedRoomId?: string;
}) {
  const t = useTranslations('desk.session.result');
  const { primary } = evaluation;
  const rec = primary.options.find((o) => o.roomCategoryId === primary.recommendedRoomCategoryId);
  const quoted = primary.options.find((o) => o.roomCategoryId === quotedRoomId);
  const verified = evaluation.trace.every((f) => f.status === 'verified');
  const saving = primary.saving > 0 && primary.options.length > 1;
  // The design's pair: what the hospital quoted against what Kavach recommends.
  const pair = rec && quoted && quoted !== rec ? [quoted, rec] : primary.options;

  return (
    <Card as="section" aria-labelledby="result-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-sm border border-primary/25 bg-primary-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
          {t('title')}
        </span>
        <VerifiedBadge verified={verified} />
      </div>
      <div>
        <h2
          id="result-title"
          className="font-display text-2xl font-extrabold leading-tight tracking-tight"
        >
          {saving
            ? t.rich('save', {
                amount: () => <AnimatedAmount value={primary.saving} className="text-safe" />,
              })
            : t('noSaving')}
        </h2>
        {rec && (
          <p className="mt-1 text-base text-muted">
            {saving ? t('reason', { room: rec.label }) : t('reasonSame', { room: rec.label })}
          </p>
        )}
      </div>
      {rec && saving && (
        <p
          role="note"
          className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-safe px-3 py-2.5 text-center font-bold text-white"
        >
          <CircleCheck aria-hidden className="size-5 shrink-0" />
          {t('ask', { room: rec.label })}
        </p>
      )}
      <RoomCompare result={{ ...primary, options: pair }} />
    </Card>
  );
}
