'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Icon } from '@/components/kavach/icon';
import { cn } from '@/components/ui/cn';
import { addDays, daysBetween, useDate } from './format';

export type Pin = { date: string; label: string };

/** Thumb diameter in px (app.css `.scrub`): pins sit where the thumb's centre would be. */
const THUMB = 22;

/**
 * S09 "As of" scrubber, after the Stitch home: a thin track filled in indigo up to the chosen
 * day, marigold dots where the cover changes, and a chip per date that jumps there. The control
 * is a native range input (`id`), so the caller labels it with a <label htmlFor>.
 */
export function DateScrubber({
  id = 'as-of',
  from,
  days,
  value,
  pins,
  onChange,
}: {
  id?: string;
  from: string;
  days: number;
  value: string;
  pins: Pin[];
  onChange: (date: string) => void;
}) {
  const t = useTranslations('plan.scrubber');
  const date = useDate();
  const offset = Math.min(days, Math.max(0, daysBetween(from, value)));
  const inRange = pins.filter((p) => p.date >= from && daysBetween(from, p.date) <= days);
  const at = (share: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${share})`;

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <input
          id={id}
          type="range"
          min={0}
          max={days}
          value={offset}
          onChange={(e) => onChange(addDays(from, Number(e.target.value)))}
          aria-valuetext={date(value, true)}
          className="scrub relative z-10"
          style={{ '--pct': at(offset / days) } as CSSProperties}
        />
        {inRange.map((pin) => (
          <span
            key={pin.date + pin.label}
            aria-hidden
            className={cn(
              'pointer-events-none absolute top-1/2 z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface',
              pin.date <= value ? 'bg-primary' : 'bg-accent',
            )}
            style={{ left: at(daysBetween(from, pin.date) / days) }}
          />
        ))}
      </div>
      {inRange.length > 0 && (
        <ul className="flex flex-wrap gap-x-2" aria-label={t('pins')}>
          {inRange.map((pin) => {
            const active = pin.date === value;
            return (
              <li key={pin.date + pin.label}>
                {/* A 48 px target around a slim chip. */}
                <button
                  type="button"
                  onClick={() => onChange(pin.date)}
                  aria-pressed={active}
                  className="group flex min-h-12 items-center"
                >
                  <span
                    // clsx: tailwind-merge would drop `text-citation-sm` as a colour.
                    className={clsx(
                      'press inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-left font-serif text-citation-sm transition-colors',
                      active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-border bg-surface-container-low text-on-surface-variant group-hover:border-primary group-hover:text-on-surface',
                    )}
                  >
                    <Icon
                      name="flag"
                      fill={active}
                      className={cn('text-sm', !active && 'text-secondary')}
                    />
                    <span>
                      <strong className="font-semibold">{date(pin.date)}</strong> · {pin.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
