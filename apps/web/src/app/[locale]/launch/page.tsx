import { setRequestLocale } from 'next-intl/server';
import { LaunchScreen } from './launch-screen';

/**
 * Only paths inside Kavach, without the locale (`/home`, `/setup/consent`): never another site
 * (`//evil.example`, `/\evil.example`) or a full URL. Anything else opens the dashboard.
 */
function safeNext(raw: string | string[] | undefined): string {
  const next = typeof raw === 'string' ? raw : '';
  // One leading slash, then no slash or backslash, and no whitespace or backslash anywhere
  // (browsers drop tabs and newlines, so "/\t/evil" would become "//evil").
  return INTERNAL.test(next) ? next : '/home';
}

const INTERNAL = /^\/(?![/\\])[^\s\\]*$/;

/** The short "Protection active" moment between signing in and the screen it leads to. */
export default async function LaunchPage({ params, searchParams }: PageProps<'/[locale]/launch'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  return <LaunchScreen next={safeNext(next)} />;
}
