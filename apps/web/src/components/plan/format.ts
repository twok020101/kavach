'use client';

import { useLocale } from 'next-intl';

/** Formats ISO dates ("2026-12-01") Indian-style: "1 Dec" or "1 Dec 2026" (Hindi: "1 दिस॰"). */
export function useDate() {
  const locale = useLocale() === 'hi' ? 'hi-IN' : 'en-IN';
  return (iso: string, withYear = false) =>
    new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
      ...(withYear && { year: 'numeric' }),
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
}

/** ISO date arithmetic, days later. */
export const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
