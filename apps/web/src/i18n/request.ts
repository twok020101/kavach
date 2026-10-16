import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * Messages live in one file per feature: messages/<locale>/<namespace>.json.
 * Each file becomes a top-level namespace, so features never edit the same file.
 */
async function loadMessages(locale: string) {
  const dir = join(process.cwd(), 'messages', locale);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const entries = await Promise.all(
    files.map(async (f) => [
      f.replace(/\.json$/, ''),
      JSON.parse(await readFile(join(dir, f), 'utf8')),
    ]),
  );
  return Object.fromEntries(entries);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await loadMessages(locale) };
});
