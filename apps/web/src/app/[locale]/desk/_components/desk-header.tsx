'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '@/components/kavach/icon';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { LogoLockup, LogoMark } from '@/components/kavach/logo';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

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
  /** In the demo, which scene this is: the other one is a tap away. */
  demoScene?: 'hospital' | 'maternity';
  /** The family, with the admitted member marked; informative only (a new session picks another). */
  members?: DeskMemberChip[];
}) {
  const t = useTranslations('desk');
  const ts = useTranslations('desk.session');
  const secondRow = Boolean(demoScene || (members && members.length > 0));
  // On a phone the scene tabs scroll sideways: open with the current scene in view (once per scene).
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = tabs.current;
    const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && on) nav.scrollLeft = on.offsetLeft - nav.offsetLeft - 16;
  }, [demoScene]);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 shadow-1 backdrop-blur-md">
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
        {subtitle && <p className="truncate text-xs font-medium text-muted">{subtitle}</p>}
      </div>

      {secondRow && (
        <div className="border-t border-border bg-surface">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 lg:px-6">
            {demoScene && (
              <nav
                aria-label={ts('scene.label')}
                ref={tabs}
                className="no-scrollbar -mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 md:mx-0 md:px-0"
              >
                {(['hospital', 'maternity'] as const).map((s) => {
                  const on = s === demoScene;
                  return (
                    <Link
                      key={s}
                      href={{
                        pathname: '/desk',
                        query: { demo: '1', ...(s === 'maternity' ? { scene: s } : {}) },
                      }}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'press inline-flex min-h-12 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3.5 text-sm',
                        on
                          ? 'bg-primary-container font-bold text-white shadow-1'
                          : 'font-medium text-muted hover:bg-sunken hover:text-text',
                      )}
                    >
                      <Icon
                        name={on ? 'radio_button_checked' : 'radio_button_unchecked'}
                        className="text-base"
                      />
                      {ts(`scene.${s}`)}
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
