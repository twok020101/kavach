'use client';

import {
  Bell,
  CalendarDays,
  ChevronsUpDown,
  Clock,
  Ellipsis,
  FileWarning,
  FolderOpen,
  Hospital,
  House,
  ListChecks,
  type LucideIcon,
  Users,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useDate } from '@/components/plan/format';
import { useActions } from '@/components/plan/queries';
import { Link, usePathname } from '@/i18n/navigation';
import { useHousehold } from '@/lib/household';
import { useStoredMemberId } from '@/lib/session';
import { buttonClasses } from '../ui/button';
import { cn } from '../ui/cn';
import { LanguageSwitch } from './language-switch';
import { Logo, LogoMark } from './logo';
import { MemberAvatar } from './member-avatar';
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
  // More owns Settings and Steps everywhere; on the phone also Timeline and Claims, which live
  // under it there (issue #26), so some tab is always lit.
  const moreRoutes = (phone: boolean) =>
    phone ? ['/settings', '/actions', '/timeline', '/claims'] : ['/settings', '/actions'];
  const isActive = (href: string, phone = false) =>
    href === '/settings'
      ? moreRoutes(phone).some((route) => pathname.startsWith(route))
      : pathname.startsWith(href);

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
        {/* The family name gives way first; the switch may hold five languages. */}
        <Link href="/home" className="flex min-w-0 flex-1 items-center gap-2" aria-label="Kavach">
          <LogoMark className="size-7 shrink-0" />
          {householdName && (
            <span className="min-w-0 truncate font-display text-base font-bold">
              {householdName}
            </span>
          )}
        </Link>
        <ThemeToggle className="shrink-0" />
        <LanguageSwitch compact className="shrink-0" />
      </header>

      {/* Desktop left nav */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-66 flex-col gap-6 border-r border-border bg-surface px-4 py-5 lg:flex">
        <div className="flex flex-col gap-3">
          <Link href="/home" className="inline-flex px-2" aria-label="Kavach">
            <Logo />
          </Link>
          {householdName && (
            // The family block (from the Stitch sidebar): a soft indigo tile naming who this is
            // for, and the way to Settings. 48 px tall; the border shows on hover and focus.
            <Link
              href="/settings"
              className="press flex min-h-12 items-center gap-2.5 rounded-md border border-transparent bg-primary-soft px-3 py-2 hover:border-primary focus-visible:border-primary"
            >
              <Users aria-hidden className="size-5 shrink-0 text-primary-hover" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="label text-primary-hover">{t('activeFamily')}</span>
                <span className="truncate font-display font-semibold leading-tight">
                  {householdName}
                </span>
              </span>
              <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted" />
            </Link>
          )}
        </div>
        <Link
          href="/desk"
          className={buttonClasses({
            variant: 'accent',
            size: 'lg',
            // Tamil and Malay labels are long: wrap inside the column rather than overrun it.
            className:
              'w-full min-w-0 whitespace-normal text-center leading-tight [overflow-wrap:anywhere]',
          })}
        >
          <Hospital aria-hidden className="size-6 shrink-0" />
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
        {/* Language and theme at the foot of the column, over a hairline (Stitch sidebar). */}
        <div className="-mx-4 mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border px-5 pt-4">
          <LanguageSwitch compact />
          <ThemeToggle />
        </div>
      </aside>

      <TopBar />

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
              active={isActive(tab.href, true)}
              label={t(`nav.${tab.key}`)}
            />
          ))}
          <li className="flex items-stretch justify-center p-1.5">
            <Link
              href="/desk"
              className="btn btn-solid btn-accent flex min-h-14 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-md bg-accent px-1 text-center text-xs font-bold leading-tight text-accent-ink [overflow-wrap:anywhere]"
            >
              <Hospital aria-hidden className="size-6" strokeWidth={2} />
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

/**
 * Laptop top bar inside the content column (Stitch): on the left a quiet chip with the demo
 * clock (or the family's name outside the demo); on the right the steps Kavach has waiting
 * as a pill, a bell that opens them, and whose app this is. Every item is real data.
 */
function TopBar() {
  const t = useTranslations('household');
  const date = useDate();
  const { data: household } = useHousehold();
  const { data: actions = [] } = useActions(household?.id);
  const memberId = useStoredMemberId();
  if (!household)
    return <div aria-hidden className="hidden h-16 border-b border-border lg:block" />;
  const waiting = actions.filter((a) => a.status === 'draft').length;
  const me =
    household.members.find((m) => m.id === memberId) ??
    household.members.find((m) => m.relation === 'self');
  return (
    <div className="sticky top-0 z-20 hidden h-16 items-center justify-between gap-4 border-b border-border bg-bg px-8 lg:flex">
      <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden className="size-4 shrink-0" />
        <span className="truncate">
          {household.isDemo && household.asOf
            ? t('demoDate', { date: date(household.asOf, true) })
            : household.name}
        </span>
        {household.isDemo && (
          <span className="rounded-sm bg-sunken px-2 py-0.5 text-xs font-semibold">
            {t('shell.sample')}
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <Link
          href="/actions"
          className={cn(
            'press inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold',
            waiting > 0
              ? 'bg-partial-bg text-partial hover:bg-partial-bg/80'
              : 'bg-sunken text-primary hover:bg-inset',
          )}
        >
          {t('shell.steps', { count: waiting })}
        </Link>
        <Link
          href="/actions"
          aria-label={t('shell.steps', { count: waiting })}
          className="press relative flex size-11 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-text"
        >
          <Bell aria-hidden className="size-5" />
          {waiting > 0 && (
            <span
              aria-hidden
              className="absolute right-2 top-2 flex min-w-4 items-center justify-center rounded-full bg-partial px-1 text-[10px] font-bold leading-4 text-surface"
            >
              {waiting}
            </span>
          )}
        </Link>
        {me && (
          <Link
            href="/settings"
            aria-label={t('shell.account', { name: me.name })}
            title={me.name}
            className="press flex size-11 items-center justify-center rounded-full hover:bg-sunken"
          >
            <MemberAvatar member={me} className="size-9 text-sm ring-1 ring-border" />
          </Link>
        )}
      </span>
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
          'press flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-center text-xs font-medium leading-tight [overflow-wrap:anywhere]',
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
