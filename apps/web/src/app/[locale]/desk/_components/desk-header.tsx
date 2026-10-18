'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { LogoMark } from '@/components/kavach/logo';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

/** One member of the family on the admitted row; `current` is the one this session is for. */
export type DeskMemberChip = { id: string; label: string; current: boolean };

/**
 * Desk top bar: the mark, "Helping with Priya" with the hospital under it, a quiet status pill,
 * the language switch and one close/end control. In the demo a second row carries the scene
 * tabs and the admitted-member chips (Stitch 10/11).
 */
export function DeskHeader({
  title,
  subtitle,
  status,
  query,
  action,
  demoScene,
  members,
}: {
  title: string;
  subtitle?: ReactNode;
  /** A quiet pill next to the title: text mode or live voice. */
  status?: ReactNode;
  query?: Record<string, string>;
  /** The close or end control; defaults to nothing. */
  action?: ReactNode;
  /** In the demo, which scene this is: the other one is a tap away (from the Stitch desk). */
  demoScene?: 'hospital' | 'maternity';
  /** The family, with the admitted member marked; informative only (a new session picks another). */
  members?: DeskMemberChip[];
}) {
  const t = useTranslations('desk');
  const ts = useTranslations('desk.session');
  const secondRow = Boolean(demoScene || (members && members.length > 0));
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-2xl flex-col gap-1.5 px-4 py-2 lg:max-w-6xl lg:px-6 lg:py-3">
        <div className="flex items-center gap-3">
          <LogoMark className="size-9 shrink-0" />
          <div className="hidden min-w-0 flex-1 sm:block">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="min-w-0 truncate font-display text-xl font-bold leading-tight">
                {title}
              </h1>
              {status}
            </div>
            {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
          </div>
          <LanguageSwitch query={query} compact className="ml-auto shrink-0" />
          <span className="shrink-0">{action}</span>
        </div>
        <div className="flex flex-col gap-0.5 sm:hidden">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="font-display text-lg font-bold leading-tight">{title}</h1>
            {status}
          </div>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        {secondRow && (
          <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 pt-1 sm:flex">
            {demoScene && (
              <nav aria-label={ts('scene.label')} className="flex gap-2">
                {(['hospital', 'maternity'] as const).map((s) => (
                  <Link
                    key={s}
                    href={{
                      pathname: '/desk',
                      query: { demo: '1', ...(s === 'maternity' ? { scene: s } : {}) },
                    }}
                    aria-current={s === demoScene ? 'page' : undefined}
                    className={cn(
                      'press inline-flex min-h-12 items-center rounded-sm px-4 text-sm font-semibold',
                      s === demoScene
                        ? 'bg-primary text-on-primary'
                        : 'bg-sunken text-muted hover:bg-primary-soft hover:text-primary',
                    )}
                  >
                    {ts(`scene.${s}`)}
                  </Link>
                ))}
              </nav>
            )}
            {members && members.length > 0 && (
              <ul
                aria-label={ts('admitted')}
                className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
              >
                <li className="mr-1 text-muted">{ts('admitted')}:</li>
                {members.map((m) => (
                  <li
                    key={m.id}
                    aria-current={m.current ? 'true' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-sm px-2.5 py-1.5',
                      m.current
                        ? 'bg-primary-soft font-semibold text-primary-hover'
                        : 'bg-sunken text-muted',
                    )}
                  >
                    {m.label}
                    {m.current && <Check aria-hidden className="size-4" strokeWidth={3} />}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <p className="sr-only">{t('modeNote')}</p>
    </header>
  );
}

export function CloseIcon() {
  return <X aria-hidden className="size-6" />;
}
