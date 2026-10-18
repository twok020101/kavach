import type { Country, DemoPersona, Locale } from '@kavach/schemas';

/**
 * The market a language implies for the demo. Mandarin and Malay are Singapore languages, so
 * switching to them switches the demo family to the Tans (S$, MediShield Life, Shield plans).
 * Hindi is India. English and Tamil are spoken in both markets, so they keep the current one.
 * A real (signed-in) household never changes market: its country is fixed.
 */
export function marketForLocale(locale: Locale): Country | undefined {
  if (locale === 'zh' || locale === 'ms') return 'SG';
  if (locale === 'hi') return 'IN';
  return undefined;
}

/** The demo family for a market. */
export const PERSONA_FOR_MARKET: Record<Country, DemoPersona> = { IN: 'sharma', SG: 'tan' };

/** The market a demo persona belongs to. */
export const MARKET_FOR_PERSONA: Record<DemoPersona, Country> = { sharma: 'IN', tan: 'SG' };

/** The demo persona a language starts with, when no household is remembered yet. */
export const personaForLocale = (locale: Locale): DemoPersona =>
  PERSONA_FOR_MARKET[marketForLocale(locale) ?? 'IN'];

/**
 * The hospital-desk example each market shows on the landing (engine figures: HX-1 for India,
 * SX-1 for Singapore; see packages/engine/scripts/check-examples.ts).
 */
export const LANDING_EXAMPLE: Record<
  Country,
  {
    persona: DemoPersona;
    /** The desk scene query for "Try the hospital scene". */
    scene: 'hospital' | 'singapore';
    patient: string;
    quotedRent: number;
    lowerRent: number;
    worstOutOfPocket: number;
    bestOutOfPocket: number;
    saving: number;
    /** The policy card to give first, as the engine names it. */
    firstCard: string;
  }
> = {
  IN: {
    persona: 'sharma',
    scene: 'hospital',
    patient: 'Suresh',
    quotedRent: 9_000,
    lowerRent: 5_000,
    worstOutOfPocket: 150_800,
    bestOutOfPocket: 60_800,
    saving: 90_000,
    firstCard: "parents' policy",
  },
  SG: {
    persona: 'tan',
    scene: 'singapore',
    patient: 'Ah Kow',
    quotedRent: 650,
    lowerRent: 280,
    worstOutOfPocket: 13_986,
    bestOutOfPocket: 987,
    saving: 12_999,
    firstCard: 'Shield plan',
  },
};
