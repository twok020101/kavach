'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { cn } from '../ui/cn';
import { LogoMark } from './logo';

export type CaptionLine = { id: string; who: 'user' | 'agent'; text: string };

/**
 * Always-on captions as a conversation (Stitch desk co-pilot): Kavach on the left in a white
 * bubble beside its shield tile, the person on the right in soft indigo. Each new line rises in.
 * When the list sits in its own scroll box, only that box follows the newest line.
 */
export function Captions({ lines, className }: { lines: CaptionLine[]; className?: string }) {
  const t = useTranslations('common.captions');
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const box = list.current?.parentElement;
    if (!box) return;
    // A scroll box of its own (the console): follow the newest line inside it, never the page.
    if (getComputedStyle(box).overflowY !== 'visible') {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    } else {
      list.current?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [lines.length]);

  return (
    <ol ref={list} role="log" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      {lines.map((line) => {
        const agent = line.who === 'agent';
        return (
          <li
            key={line.id}
            className={cn(
              'rise-in flex items-start gap-2.5',
              agent ? 'justify-start' : 'justify-end',
            )}
          >
            {/* Kavach speaks from its shield tile; the person's line sits on the right. */}
            {agent && (
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary-soft"
              >
                <LogoMark className="size-6" />
              </span>
            )}
            <div
              className={cn(
                'max-w-[88%] px-4 py-3 text-sm leading-relaxed text-text sm:text-base sm:leading-relaxed',
                agent
                  ? 'rounded-2xl rounded-tl-sm border border-border bg-surface shadow-1'
                  : 'rounded-2xl rounded-br-sm bg-primary-soft font-medium',
              )}
            >
              <span className="sr-only">{agent ? t('agent') : t('user')}: </span>
              {line.text}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
