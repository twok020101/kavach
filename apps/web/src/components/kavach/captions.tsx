'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { cn } from '../ui/cn';
import { LogoMark } from './logo';

export type CaptionLine = { id: string; who: 'user' | 'agent'; text: string };

/** Always-on captions as a conversation: Kavach on the left with its mark, the person on the right. */
export function Captions({ lines, className }: { lines: CaptionLine[]; className?: string }) {
  const t = useTranslations('common.captions');
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lines.length]);

  return (
    <ol role="log" aria-live="polite" className={cn('flex flex-col gap-2', className)}>
      {lines.map((line, i) => {
        const agent = line.who === 'agent';
        return (
          <li
            key={line.id}
            ref={i === lines.length - 1 ? end : undefined}
            className={cn('flex items-start gap-2', agent ? 'justify-start' : 'justify-end')}
          >
            {/* Kavach speaks from its shield tile; the person's line sits on the right. */}
            {agent && (
              <span
                aria-hidden
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface"
              >
                <LogoMark className="size-5" />
              </span>
            )}
            <div
              className={cn(
                'max-w-[88%] rounded-lg px-3 py-2 text-base',
                agent
                  ? 'rounded-tl-sm border border-border bg-surface font-semibold text-text'
                  : 'rounded-br-sm bg-primary-soft text-text',
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
