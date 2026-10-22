import type { Country, Locale } from '@kavach/schemas';

/** The language's own name and the English name, for prompts, notes and the member list. */
export const LANGUAGE_NAMES: Record<Locale, { english: string; native: string }> = {
  en: { english: 'English', native: 'English' },
  hi: { english: 'Hindi', native: 'हिंदी' },
  ta: { english: 'Tamil', native: 'தமிழ்' },
  zh: { english: 'Mandarin Chinese (Simplified)', native: '中文' },
  ms: { english: 'Malay', native: 'Bahasa Melayu' },
};

/** BCP-47 tag for dates and numbers: Hindi is always Indian; the rest follow the market. */
export const languageTag = (locale: Locale, country: Country = 'IN') =>
  locale === 'hi' ? 'hi-IN' : `${locale}-${country}`;
