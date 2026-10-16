'use client';

import {
  Clock,
  Ellipsis,
  FileWarning,
  FolderOpen,
  Hospital,
  House,
  ListChecks,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { buttonClasses } from '../ui/button';
import { cn } from '../ui/cn';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

const tabs = [
  { href: '/home', key: 'home', icon: House },
  { href: '/plan', key: 'plan', icon: ListChecks },
  { href: '/policies', key: 'policies', icon: FolderOpen },
  { href: '/timeline', key: 'timeline', icon: Clock },
  { href: '/claims', key: 'claims', icon: FileWarning },
  { href: '/settings', key: 'more', icon: Ellipsis },
] as const;

/**
 * Signed-in app frame. Mobile: top bar, bottom tab bar and the floating "At the hospital" pill.
 * Desktop: a 264 px left nav with the hospital button at the top, content up to 1200 px.
 */
export function AppShell({
  householdName,
  showHospitalButton = false,
  children,
}: {
  householdName?: string;
  showHospitalButton?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('common');
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <div className="flex min-h-dvh flex-col lg:pl-66">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3"
      >
        {t('skipToContent')}
      </a>

      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur lg:hidden">
        <Logo />
        {householdName && <span className="truncate text-sm text-muted">{householdName}</span>}
        <ThemeToggle className="ml-auto" />
        <LanguageSwitch />
      </header>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-6 border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="flex flex-col gap-1 px-2">
          <Logo />
          {householdName && <span className="truncate text-sm text-muted">{householdName}</span>}
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
            {tabs.map(({ href, key, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-md px-3 font-medium',
                    isActive(href)
                      ? 'bg-primary-soft text-primary'
                      : 'text-muted hover:bg-sunken hover:text-text',
                  )}
                >
                  <Icon aria-hidden className="size-5" />
                  {t(`nav.${key}`)}
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

      {showHospitalButton && (
        <Link
          href="/desk"
          className={buttonClasses({
            variant: 'accent',
            size: 'lg',
            className: 'fixed bottom-20 right-4 z-30 rounded-full shadow-lg lg:hidden',
          })}
        >
          <Hospital aria-hidden className="size-6" />
          {t('atHospital')}
        </Link>
      )}

      <nav
        aria-label={t('mainNav')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-6">
          {tabs.map(({ href, key, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  isActive(href) ? 'text-primary' : 'text-muted hover:text-text',
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={isActive(href) ? 2.25 : 1.75} />
                {t(`nav.${key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
