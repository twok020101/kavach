'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Icon } from '@/components/kavach/icon';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { LogoLockup, LogoMark } from '@/components/kavach/logo';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import type { DemoScene } from '@/lib/desk-client';

/** One member of the family on the admitted row; `current` is the one this session is for. */
export type DeskMemberChip = { id: string; label: string; current: boolean };

/**
 * Desk top bar (Stitch desk co-pilot): the Kavach lockup, "Helping with Suresh" with a true
 * session chip and the hospital and procedure under it; on the right the voice/text status, the
 * language switch and one close/end control. In the demo a second bar carries the scene tabs
 * (switching starts that scene) and the admitted-member chips.
 */
export function DeskHeader({
  title,
  chip,
  subtitle,
  status,
  query,
  action,
  demoScene,
  members,
}: {
  title: string;
  /** A small chip beside the title, e.g. "Session open". */
  chip?: ReactNode;
  subtitle?: ReactNode;
  /** The voice/text status pill on the right. */
  status?: ReactNode;
  query?: Record<string, string>;
  /** The close or end control; defaults to nothing. */
  action?: ReactNode;
  /** In the demo, which scene this is: the others are a tap away. */
  demoScene?: DemoScene;
  /** The family, with the admitted member marked; informative only (a new session picks another). */
  members?: DeskMemberChip[];
}) {
  const t = useTranslations('desk');
  const ts = useTranslations('desk.session');
  const secondRow = Boolean(demoScene || (members && members.length > 0));
  return (
    // Sticky from a tablet up; on a phone the controls dock already holds the bottom of the
    // screen, so the header (title, scene tabs) scrolls away and leaves the bill the room.
    <header className="relative z-30 border-b md:sticky md:top-0 border-border bg-surface/95 shadow-1 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 lg:gap-4 lg:px-6">
        <LogoMark className="size-10 shrink-0 lg:hidden" />
        <LogoLockup className="hidden h-11 shrink-0 lg:block" />
        <span aria-hidden className="hidden h-9 w-px bg-border lg:block" />
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="min-w-0 truncate font-display text-lg font-bold leading-tight tracking-tight text-text lg:text-xl">
              {title}
            </h1>
            {chip && <span className="hidden shrink-0 sm:inline-flex">{chip}</span>}
          </div>
          {subtitle && (
            <p className="truncate text-xs font-medium text-muted lg:text-sm">{subtitle}</p>
          )}
        </div>
        {status && <span className="hidden shrink-0 md:inline-flex">{status}</span>}
        <LanguageSwitch query={query} compact className="ml-auto shrink-0 sm:ml-0" />
        <span className="shrink-0">{action}</span>
      </div>
      {/* Phone: the title gets its own line under the bar, so it is never cut. */}
      <div className="flex flex-col gap-0.5 px-4 pb-2.5 sm:hidden">
        <h1 className="font-display text-lg font-bold leading-tight text-text">{title}</h1>
        {subtitle && <p className="line-clamp-2 text-xs font-medium text-muted">{subtitle}</p>}
      </div>

      {secondRow && (
        <div className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 lg:px-6">
            {demoScene && (
              // Phone: three equal tabs, the patient over the place, so none is cut at the edge.
              <nav
                aria-label={ts('scene.label')}
                className="grid shrink-0 grid-cols-3 gap-1.5 md:flex md:flex-wrap md:gap-2"
              >
                {(['hospital', 'maternity', 'singapore'] as const).map((s) => {
                  const on = s === demoScene;
                  return (
                    <Link
                      key={s}
                      href={{
                        pathname: '/desk',
                        query: { demo: '1', ...(s === 'hospital' ? {} : { scene: s }) },
                      }}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'press flex min-h-14 min-w-0 flex-col items-center justify-center rounded-md px-1.5 py-1 text-center text-xs leading-tight md:inline-flex md:min-h-12 md:shrink-0 md:flex-row md:gap-1.5 md:whitespace-nowrap md:px-3.5 md:py-0 md:text-sm',
                        on
                          ? 'bg-primary-container font-bold text-white shadow-1'
                          : 'border border-border font-medium text-muted hover:bg-sunken hover:text-text md:border-transparent',
                      )}
                    >
                      <Icon
                        name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                        className="hidden text-base md:inline"
                      />
                      <span className="hidden md:inline">{ts(`scene.${s}`)}</span>
                      <span className="font-bold md:hidden">{ts(`scene.name.${s}`)}</span>
                      <span className={cn('md:hidden', on ? 'text-white/85' : 'text-muted')}>
                        {ts(`scene.place.${s}`)}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}
            {members && members.length > 0 && (
              // Laptop: the whole chip row moves under the scene tabs when it doesn't fit beside them,
              // and the chips themselves wrap rather than run off the edge.
              <div className="hidden min-w-0 max-w-full items-center gap-2 text-sm md:flex">
                <span className="shrink-0 text-muted">{ts('admitted')}:</span>
                <ul
                  aria-label={ts('admitted')}
                  className="flex min-w-0 flex-wrap items-center gap-1 whitespace-nowrap rounded-md bg-sunken p-1"
                >
                  {members.map((m) => (
                    <li
                      key={m.id}
                      aria-current={m.current ? 'true' : undefined}
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-sm px-2.5 py-1',
                        m.current
                          ? 'bg-surface font-bold text-primary-hover shadow-1'
                          : 'text-muted',
                      )}
                    >
                      {m.label}
                      {m.current && <Icon name="check" weight={600} className="text-safe" />}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
      <p className="sr-only">{t('modeNote')}</p>
    </header>
  );
}

/** The close (×) glyph for the start screen's header. */
export function CloseIcon() {
  return <Icon name="close" className="text-2xl" />;
}
