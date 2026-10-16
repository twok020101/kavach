'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { cn } from '../ui/cn';

export type CaptionLine = { id: string; who: 'user' | 'agent'; text: string };

/** Always-on captions: agent lines bold, the user's lines muted. */
export function Captions({ lines, className }: { lines: CaptionLine[]; className?: string }) {
  const t = useTranslations('common.captions');
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lines.length]);

  return (
    <ol role="log" aria-live="polite" className={cn('flex flex-col gap-3', className)}>
      {lines.map((line, i) => (
        <li
          key={line.id}
          ref={i === lines.length - 1 ? end : undefined}
          className={cn('text-lg', line.who === 'agent' ? 'font-semibold text-text' : 'text-muted')}
        >
          <span className="block text-sm font-medium text-muted">
            {line.who === 'agent' ? t('agent') : t('user')}
          </span>
          {line.text}
        </li>
      ))}
    </ol>
  );
}
