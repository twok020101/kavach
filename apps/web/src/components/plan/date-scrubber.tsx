'use client';

import { CalendarClock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui/cn';
import { addDays, daysBetween, useDate } from './format';

export type Pin = { date: string; label: string };

/** S09 "As of" scrubber: drag through the coming months; pins mark days the cover changes. */
export function DateScrubber({
  from,
  days,
  value,
  pins,
  onChange,
}: {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="as-of" className="flex items-center gap-1.5 font-semibold">
          <CalendarClock aria-hidden className="size-5 text-primary" />
          {t('asOf', { date: date(value, true) })}
        </label>
        {value !== from && (
          <button
            className="press min-h-10 rounded-md px-2.5 text-sm font-semibold text-primary hover:bg-primary-soft"
            onClick={() => onChange(from)}
          >
            {t('today')}
          </button>
        )}
      </div>
      <div className="relative">
        <input
          id="as-of"
          type="range"
          min={0}
          max={days}
          value={offset}
          onChange={(e) => onChange(addDays(from, Number(e.target.value)))}
          aria-valuetext={date(value, true)}
          className="h-10 w-full cursor-pointer"
        />
        {inRange.map((pin) => (
          <span
            key={pin.date + pin.label}
            aria-hidden
            className="pointer-events-none absolute top-[11px] h-[18px] w-0.5 rounded-full bg-accent"
            style={{ left: `calc(${(daysBetween(from, pin.date) / days) * 100}% )` }}
          />
        ))}
      </div>
      {inRange.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t('pins')}>
          {inRange.map((pin) => (
            <li key={pin.date + pin.label}>
              <button
                onClick={() => onChange(pin.date)}
                className={cn(
                  'press min-h-9 rounded-full border px-3 text-xs font-medium',
                  pin.date === value
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-surface hover:border-primary',
                )}
              >
                {date(pin.date)} · {pin.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
