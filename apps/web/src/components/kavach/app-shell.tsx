'use client';

import {
  Clock,
  Ellipsis,
  FileWarning,
  FolderOpen,
  Hospital,
  House,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { buttonClasses } from '../ui/button';
import { cn } from '../ui/cn';
import { LanguageSwitch } from './language-switch';
import { Logo, LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';

type Tab = {
  href: '/home' | '/plan' | '/policies' | '/timeline' | '/claims' | '/settings';
  key: string;
  icon: LucideIcon;
};

const desktopTabs: Tab[] = [
  { href: '/home', key: 'home', icon: House },
  { href: '/plan', key: 'plan', icon: ListChecks },
  { href: '/policies', key: 'policies', icon: FolderOpen },
  { href: '/timeline', key: 'timeline', icon: Clock },
  { href: '/claims', key: 'claims', icon: FileWarning },
  { href: '/settings', key: 'more', icon: Ellipsis },
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
      className={cn('absolute inset-0 rounded-md bg-primary-soft', className)}
      transition={reduce ? { duration: 0 } : { duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
    />
  );
}

/**
 * Signed-in app frame. Phone: a slim top bar and a bottom bar whose centre cell is the
 * marigold "Hospital" control, filled and flat, on every screen, so the one action that
 * matters in a crisis is always under the thumb. Desktop: a 264 px left nav (07 §5) with the
 * same button at the top, content up to 1200 px. No wash, blur or glow (plain register).
 */
export function AppShell({
  householdName,
  children,
}: {
  householdName?: string;
  children: ReactNode;
}) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/settings' ? pathname.startsWith('/settings') : pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col lg:pl-66">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3"
      >
        {t('skipToContent')}
      </a>

      {/* Phone top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg px-4 py-2 lg:hidden">
        <Link href="/home" className="flex items-center gap-2" aria-label="Kavach">
          <LogoMark className="size-7" />
          {householdName && (
            <span className="truncate font-display text-base font-bold">{householdName}</span>
          )}
        </Link>
        <ThemeToggle className="ml-auto" />
        <LanguageSwitch compact />
      </header>

      {/* Desktop left nav */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-6 border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="flex flex-col gap-1 px-2">
          <Link href="/home" className="inline-flex" aria-label="Kavach">
            <Logo />
          </Link>
          {householdName && (
            <span className="truncate text-sm font-medium text-muted">{householdName}</span>
          )}
        </div>
        <Link
          href="/desk"
          className={buttonClasses({ variant: 'accent', size: 'lg', className: 'w-full' })}
        >
          <Hospital aria-hidden className="size-6" />
          {t('atHospital')}
        </Link>
        <nav aria-label={t('mainNav')}>
          <ul className="flex flex-col gap-1">
            {desktopTabs.map(({ href, key, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={cn(
                    'press relative flex min-h-12 items-center gap-3 rounded-md px-3 font-medium',
                    isActive(href)
                      ? 'text-primary-hover'
                      : 'text-muted hover:bg-sunken hover:text-text',
                  )}
                >
                  {isActive(href) && <ActivePill id="nav-pill" />}
                  <Icon
                    aria-hidden
                    className="relative size-5"
                    strokeWidth={isActive(href) ? 2.25 : 1.75}
                  />
                  <span className="relative">{t(`nav.${key}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex items-center gap-2 px-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </aside>

      <main
        id="main"
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-4 lg:max-w-[1200px] lg:px-8 lg:pb-12 lg:pt-8"
      >
        {children}
      </main>

      {/* Phone bottom bar */}
      <nav
        aria-label={t('mainNav')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {phoneLeft.map((tab) => (
            <PhoneTab
              key={tab.key}
              tab={tab}
              active={isActive(tab.href)}
              label={t(`nav.${tab.key}`)}
            />
          ))}
          <li className="flex items-stretch justify-center p-1.5">
            <Link
              href="/desk"
              className="btn btn-solid btn-accent flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md bg-accent text-xs font-bold text-accent-ink"
            >
              <Hospital aria-hidden className="size-6" strokeWidth={2} />
              {t('nav.hospital')}
            </Link>
          </li>
          {phoneRight.map((tab) => (
            <PhoneTab
              key={tab.key}
              tab={tab}
              active={isActive(tab.href)}
              label={t(`nav.${tab.key}`)}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}

function PhoneTab({ tab, active, label }: { tab: Tab; active: boolean; label: string }) {
  const Icon = tab.icon;
  return (
    <li>
      <Link
        href={tab.href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'press flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium',
          active ? 'text-primary' : 'text-muted hover:text-text',
        )}
      >
        <span className="relative flex h-7 w-12 items-center justify-center rounded-md">
          {active && <ActivePill id="tab-pill" />}
          <Icon aria-hidden className="relative size-6" strokeWidth={active ? 2.25 : 1.75} />
        </span>
        {label}
      </Link>
    </li>
  );
}
