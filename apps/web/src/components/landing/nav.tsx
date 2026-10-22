import type { Country } from '@kavach/engine';
import { Icon } from '@/components/kavach/icon';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { LogoMark } from '@/components/kavach/logo';
import { ThemeToggle } from '@/components/kavach/theme-toggle';
import { Link } from '@/i18n/navigation';
import { landingT } from './market-t';

/** The thin announcement bar and the glass header of the landing page (Stitch top bar). */
export async function LandingNav({ market }: { market: Country }) {
  const tn = await landingT('nav', market);
  const ta = await landingT('announce', market);
  const t = (key: string) => (key.startsWith('nav.') ? tn(key.slice(4)) : ta(key.slice(9)));
  const desk = market === 'SG' ? { demo: '1', scene: 'singapore' } : { demo: '1' };
  const links = [
    { href: '/demo', label: t('nav.demo') },
    { href: { pathname: '/desk', query: desk }, label: t('nav.desk') },
    { href: '/home', label: t('nav.cover') },
    { href: '/claims', label: t('nav.claim') },
    { href: '/proof', label: t('nav.proof') },
  ] as const;

  return (
    <header className="glass sticky top-0 z-40 shadow-[0_1px_8px_rgba(15,27,61,0.05)]">
      {/* Three true statements and the prototype mark. */}
      <div className="border-b border-surface-container bg-surface-container-low px-4 py-1.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 font-serif text-citation-sm text-on-surface-variant">
          <p className="flex min-w-0 items-center gap-2">
            <Icon name="verified" className="text-sm text-safe" />
            <span className="truncate">{t('announce.cited')}</span>
            <span aria-hidden className="hidden text-outline-variant md:inline">
              •
            </span>
            <span className="hidden md:inline">{t('announce.noCommission')}</span>
            <span aria-hidden className="hidden text-outline-variant md:inline">
              •
            </span>
            <span className="hidden md:inline">{t('announce.prototype')}</span>
          </p>
          <span className="flex shrink-0 items-center gap-1.5 font-sans text-label-caps uppercase text-safe">
            <span aria-hidden className="size-1.5 rounded-full bg-safe" />
            {t('announce.badge')}
          </span>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={t('nav.label')}>
          <span className="flex size-10 items-center justify-center rounded-md bg-white p-0.5 shadow-1">
            <LogoMark className="size-9" />
          </span>
          {/* Under 400px the five-language switch needs the room: the mark alone links home. */}
          <span className="hidden flex-col min-[400px]:flex">
            <span className="flex items-center gap-2">
              <span className="font-display text-headline-sm font-bold tracking-tight text-primary">
                Kavach
              </span>
              <span
                lang="hi"
                className="hidden rounded-sm border border-surface-container-high bg-surface-container px-2 py-0.5 font-display text-xs font-bold text-primary sm:inline"
              >
                कवच
              </span>
            </span>
            <span className="hidden text-label-caps uppercase text-on-surface-variant sm:block">
              {t('nav.eyebrow')}
            </span>
          </span>
        </Link>

        <nav aria-label={t('nav.label')} className="hidden items-center gap-1 xl:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="flex min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-title-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <LanguageSwitch compact className="rounded-full [&>a]:rounded-full" />
          <ThemeToggle className="hidden sm:flex" />
          <Link
            href="/sign-in"
            className="hidden min-h-11 items-center whitespace-nowrap rounded-sm px-3 text-title-md font-semibold text-primary hover:bg-primary-soft lg:flex xl:hidden 2xl:flex"
          >
            {t('nav.signIn')}
          </Link>
          {/* On a phone the hospital way in is the icon alone (its name stays for screen readers). */}
          <Link
            href="/desk"
            className="btn-solid btn-accent flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md bg-accent px-2 text-title-md font-bold text-accent-ink hover:bg-accent-hover sm:px-4"
          >
            <span aria-hidden className="hidden sm:inline-flex">
              <span
                className="live-dot"
                style={{ '--live': 'var(--m3-secondary)' } as React.CSSProperties}
              />
            </span>
            <Icon name="local_hospital" fill className="text-xl sm:text-lg" />
            <span className="sr-only sm:not-sr-only">{t('nav.atHospital')}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
