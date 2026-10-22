import type { Country } from '@kavach/engine';
import { getTranslations } from 'next-intl/server';

type T = Awaited<ReturnType<typeof getTranslations>>;
type Call = (key: string, ...rest: unknown[]) => unknown;

/**
 * `landing.<section>` messages for one market. The page follows the reader's market (Mandarin
 * and Malay are Singapore): there, a key under `landing.sg.<section>` wins where it exists, so
 * the Singapore page says dollars, MediShield Life and the Tans while sharing every other line.
 */
export async function landingT(section: string, market: Country): Promise<T> {
  const t = await getTranslations(`landing.${section}`);
  if (market !== 'SG') return t;
  const sg = await getTranslations(`landing.sg.${section}`);
  const pick = (key: string) => (sg.has(key) ? sg : t) as unknown as Call & Record<string, Call>;
  const out = ((key: string, ...rest: unknown[]) => pick(key)(key, ...rest)) as unknown as Record<
    string,
    unknown
  >;
  for (const m of ['rich', 'markup', 'raw'] as const)
    out[m] = (key: string, ...rest: unknown[]) => pick(key)[m]!(key, ...rest);
  out.has = (key: string) => sg.has(key) || t.has(key);
  return out as unknown as T;
}
