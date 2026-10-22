'use client';

import { clsx } from 'clsx';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useDate } from '@/components/plan/format';
import { Link, usePathname } from '@/i18n/navigation';
import { useHousehold } from '@/lib/household';
import { cn } from '../ui/cn';
import { Icon } from './icon';
import { LanguageSwitch } from './language-switch';
import { LogoLockup, LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';

type Tab = {
  href: '/home' | '/plan' | '/policies' | '/timeline' | '/claims' | '/settings';
  key: string;
  /** Material Symbols ligature (the Stitch sidebar set). */
  icon: string;
};

const desktopTabs: Tab[] = [
  { href: '/home', key: 'home', icon: 'home' },
  { href: '/plan', key: 'plan', icon: 'health_and_safety' },
  { href: '/policies', key: 'policies', icon: 'description' },
  { href: '/timeline', key: 'timeline', icon: 'timeline' },
  { href: '/claims', key: 'claims', icon: 'receipt_long' },
  { href: '/settings', key: 'more', icon: 'more_horiz' },
];

/** Phone: four tabs around the hospital cell in the middle. */
const phoneLeft: Tab[] = [desktopTabs[0]!, desktopTabs[1]!];
const phoneRight: Tab[] = [desktopTabs[2]!, desktopTabs[5]!];

/** The soft indigo pill that slides from the old tab to the new one (250 ms, strong ease-out). */
function ActivePill({ id, className }: { id: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      layoutId={id}
      className={cn('absolute inset-0 rounded-md bg-surface-container-high', className)}
      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
    />
  );
}

/**
 * Signed-in app frame, after the Stitch dashboard. Desktop: a 288 px white sidebar (logo tile,
 * the active family, the marigold "At the hospital" button, the nav with a sliding pill, language
 * and theme at the foot) and a sticky glass top bar over the content (desk status, demo date,
 * what's coming up, the family). Phone: a slim top bar and a bottom bar whose centre cell is the
 * marigold hospital control, so the one action that matters in a crisis is always under the thumb.
 */
export function AppShell({
  householdName,
  children,
}: {
  householdName?: string;
  children: ReactNode;
}) {
  const t = useTranslations('common');
  const ts = useTranslations('plan.shell');
  const date = useDate();
  const pathname = usePathname();
  // The same cached query every screen already reads: no extra request.
  const { data: household } = useHousehold();
  const name = householdName ?? household?.name;
  const owner = household?.members.find((m) => m.relation === 'self');
  const initial = (owner?.name ?? name ?? '').trim().charAt(0).toUpperCase();
  // More owns Settings and Steps everywhere; on the phone also Timeline and Claims, which live
  // under it there (issue #26), so some tab is always lit.
  const moreRoutes = (phone: boolean) =>
    phone ? ['/settings', '/actions', '/timeline', '/claims'] : ['/settings', '/actions'];
  const isActive = (href: string, phone = false) =>
    href === '/settings'
      ? moreRoutes(phone).some((route) => pathname.startsWith(route))
      : pathname.startsWith(href);

  return (
    <div className="app-shell flex min-h-dvh flex-col lg:pl-72">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3"
      >
        {t('skipToContent')}
      </a>

      {/* Phone top bar */}
      <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b border-border px-4 py-2 lg:hidden">
        {/* The family name gives way first; the switch may hold five languages. */}
        <Link
          href="/home"
          className="flex min-h-12 min-w-0 flex-1 items-center gap-2"
          aria-label="Kavach"
        >
          <LogoMark className="size-8 shrink-0" />
          {name && (
            <span className="min-w-0 truncate font-display text-title-md text-on-surface">
              {name}
            </span>
          )}
        </Link>
        <ThemeToggle className="shrink-0" />
        <LanguageSwitch compact className="shrink-0" />
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col justify-between border-r border-border bg-surface shadow-[0_1px_8px_rgba(15,27,61,0.04)] lg:flex">
        <div className="flex min-h-0 flex-col overflow-y-auto">
          <div className="px-6 pb-4 pt-6">
            <Link
              href="/home"
              aria-label="Kavach"
              className="press inline-flex rounded-sm bg-white px-2 py-1.5 ring-1 ring-outline-variant/30"
            >
              <LogoLockup className="h-7" />
            </Link>
            {name && (
              // The family block: who this is for, and the way to Settings.
              <Link
                href="/settings"
                className="press mt-4 flex min-h-14 items-center justify-between gap-2 rounded-md bg-surface-container-low p-2 pl-3 transition-colors hover:bg-surface-container"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon name="diversity_1" className="text-xl text-primary" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-label-caps uppercase text-on-surface-variant [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal">
                      {t('activeFamily')}
                    </span>
                    <span className="truncate font-display text-title-md leading-tight text-on-surface">
                      {name}
                    </span>
                  </span>
                </span>
                <Icon name="unfold_more" className="text-lg text-on-surface-variant" />
              </Link>
            )}
          </div>
          <div className="px-6 pb-2">
            <Link
              href="/desk"
              className="hospital-cta press flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-center font-display text-title-md leading-tight text-accent-ink hover:bg-accent-hover [overflow-wrap:anywhere]"
            >
              <Icon name="local_hospital" weight={500} className="text-xl" />
              {t('atHospital')}
            </Link>
          </div>
          <nav aria-label={t('mainNav')} className="px-3 pt-2">
            <ul className="flex flex-col gap-1">
              {desktopTabs.map(({ href, key, icon }) => {
                const active = isActive(href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      // clsx, not cn: tailwind-merge reads `text-body-md` as a colour and drops it.
                      className={clsx(
                        'press relative flex min-h-12 items-center gap-4 rounded-md px-4 text-body-md transition-colors',
                        active
                          ? 'font-semibold text-primary'
                          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface',
                      )}
                    >
                      {active && <ActivePill id="nav-pill" />}
                      <Icon name={icon} fill={active} className="relative text-xl" />
                      <span className="relative">{t(`nav.${key}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex flex-col gap-2 border-t border-border p-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <LanguageSwitch compact />
            <ThemeToggle />
          </div>
          <p className="flex items-center gap-1.5 px-1 font-serif text-citation-sm text-on-surface-variant">
            <Icon name="science" className="text-sm text-tertiary-container" />
            {ts('footer')}
          </p>
        </div>
      </aside>

      {/* Desktop top bar: sticky glass over the scrolling page. */}
      <header className="glass sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-border px-10 lg:flex">
        <Link
          href="/desk"
          className="press -ml-2 flex min-h-12 items-center gap-2.5 rounded-md px-2 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <span className="live-dot" />
          {ts('deskReady')}
        </Link>
        <div className="flex items-center gap-2">
          {/* Home shows the demo clock itself, with the way back to the start. */}
          {household?.isDemo && household.asOf && !pathname.startsWith('/home') && (
            <span className="mr-2 inline-flex items-center gap-1.5 rounded-md bg-surface-container-low px-3 py-1.5 text-body-sm text-on-surface">
              <Icon name="calendar_today" className="text-base text-primary" />
              {ts.rich('demoDate', {
                date: date(household.asOf, true),
                b: (chunks) => <strong className="font-semibold">{chunks}</strong>,
              })}
            </span>
          )}
          <Link
            href="/timeline"
            aria-label={ts('comingUp')}
            className="press flex size-12 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <Icon name="notifications" className="text-[22px]" />
          </Link>
          {initial && (
            <Link
              href="/settings"
              aria-label={ts('family', { name: name ?? '' })}
              className="press flex size-12 items-center justify-center rounded-full"
            >
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-primary-fixed font-display text-body-md font-bold text-on-primary-fixed ring-2 ring-surface"
              >
                {initial}
              </span>
            </Link>
          )}
        </div>
      </header>

      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-5 lg:max-w-[1280px] lg:px-10 lg:pb-14 lg:pt-10"
      >
        {children}
      </main>

      {/* Phone bottom bar */}
      <nav
        aria-label={t('mainNav')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,27,61,0.05)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {phoneLeft.map((tab) => (
            <PhoneTab
              key={tab.key}
              tab={tab}
              active={isActive(tab.href, true)}
              label={t(`nav.${tab.key}`)}
            />
          ))}
          <li className="flex items-stretch justify-center p-1.5">
            <Link
              href="/desk"
              className="hospital-cta press flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md bg-accent px-1 text-center text-xs font-bold leading-tight text-accent-ink [overflow-wrap:anywhere]"
            >
              <Icon name="local_hospital" fill className="text-2xl" />
              {t('nav.hospital')}
            </Link>
          </li>
          {phoneRight.map((tab) => (
            <PhoneTab
              key={tab.key}
              tab={tab}
              active={isActive(tab.href, true)}
              label={t(`nav.${tab.key}`)}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function PhoneTab({ tab, active, label }: { tab: Tab; active: boolean; label: string }) {
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'press flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center text-xs leading-tight [overflow-wrap:anywhere]',
          active ? 'font-semibold text-primary' : 'font-medium text-on-surface-variant',
        )}
      >
        <span className="relative flex h-7 w-12 items-center justify-center rounded-md">
          {active && <ActivePill id="tab-pill" className="rounded-full" />}
          <Icon name={tab.icon} fill={active} className="relative text-[22px]" />
        </span>
        {label}
      </Link>
    </li>
  );
}
