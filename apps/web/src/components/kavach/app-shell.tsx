'use client';

import { Clock, Ellipsis, FolderOpen, Hospital, House, ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { buttonClasses } from '../ui/button';
import { cn } from '../ui/cn';
import { LanguageSwitch } from './language-switch';
import { Logo } from './logo';

const tabs = [
  { href: '/home', key: 'home', icon: House },
  { href: '/plan', key: 'plan', icon: ListChecks },
  { href: '/policies', key: 'policies', icon: FolderOpen },
  { href: '/timeline', key: 'timeline', icon: Clock },
  { href: '/settings', key: 'more', icon: Ellipsis },
] as const;

/** Signed-in app frame: top bar, content, bottom tab bar and the "At the hospital" pill. */
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

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:p-3"
      >
        {t('skipToContent')}
      </a>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur">
        <Logo />
        {householdName && <span className="truncate text-sm text-muted">{householdName}</span>}
        <LanguageSwitch className="ml-auto" />
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-4">
        {children}
      </main>

      {showHospitalButton && (
        <Link
          href="/desk"
          className={buttonClasses({
            variant: 'accent',
            size: 'lg',
            className: 'fixed bottom-20 right-4 z-30 rounded-full shadow-lg',
          })}
        >
          <Hospital aria-hidden className="size-6" />
          {t('atHospital')}
        </Link>
      )}

      <nav
        aria-label={t('mainNav')}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-3xl grid-cols-5">
          {tabs.map(({ href, key, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                    active ? 'text-primary' : 'text-muted hover:text-text',
                  )}
                >
                  <Icon aria-hidden className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                  {t(`nav.${key}`)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
