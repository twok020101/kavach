'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { cn } from '../ui/cn';
import { LogoMark } from './logo';

export type CaptionLine = { id: string; who: 'user' | 'agent'; text: string };

/**
 * Always-on captions as a conversation (Stitch desk): Kavach on the left, its mark in a small
 * tile and a white bubble; the person on the right in a soft indigo bubble.
 */
export function Captions({ lines, className }: { lines: CaptionLine[]; className?: string }) {
  const t = useTranslations('common.captions');
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lines.length]);

  return (
    <ol role="log" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      {lines.map((line, i) => {
        const agent = line.who === 'agent';
        return (
          <li
            key={line.id}
            ref={i === lines.length - 1 ? end : undefined}
            className={cn('flex items-start gap-2', agent ? 'justify-start' : 'justify-end')}
          >
            {agent && (
              <span
                aria-hidden
                className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary-soft"
              >
                <LogoMark className="size-6" />
              </span>
            )}
            <div
              className={cn(
                'max-w-[88%] rounded-lg px-4 py-3 text-base leading-relaxed',
                agent
                  ? 'rounded-tl-sm border border-border bg-surface text-text'
                  : 'rounded-tr-sm bg-primary-soft text-text',
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
