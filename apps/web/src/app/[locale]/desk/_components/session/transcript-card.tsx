'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Captions, type CaptionLine } from '@/components/kavach/captions';
import { cn } from '@/components/ui/cn';

/**
 * Kavach's side of the conversation (Stitch desk co-pilot speech bubbles): the captions in a box
 * of their own on a laptop (they follow the newest line without moving the page), and what the
 * agent is doing right now under them.
 */
export function TranscriptCard({
  lines,
  steps,
  className,
}: {
  lines: CaptionLine[];
  /** The live agent's steps or the text-mode ticker, while something is running. */
  steps?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('desk.session');
  return (
    <section
      aria-label={t('conversation')}
      className={cn('flex min-h-0 flex-col gap-3', className)}
    >
      <h2 className="label hidden px-1 lg:block">{t('conversation')}</h2>
      <div className="min-h-0 flex-1 lg:-mx-1 lg:max-h-[28rem] lg:overflow-y-auto lg:px-1 lg:pb-1">
        <Captions lines={lines} />
      </div>
      {steps && (
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-1">
          {steps}
        </div>
      )}
    </section>
  );
}
