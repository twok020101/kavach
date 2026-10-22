'use client';

import { useLocale } from 'next-intl';

/** BCP-47 tag for dates: Hindi, Tamil and English are Indian; Mandarin and Malay are Singaporean. */
export const dateTag = (locale: string) =>
  ({ en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', zh: 'zh-SG', ms: 'ms-SG' })[locale] ?? 'en-IN';

/** Formats ISO dates ("2026-12-01") Indian-style: "1 Dec" or "1 Dec 2026" (Hindi: "1 दिस॰"). */
export function useDate() {
  const locale = dateTag(useLocale());
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
