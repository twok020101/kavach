'use client';

import type { Member } from '@kavach/schemas';
import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import type { DemoScene } from '@/lib/desk-client';
import { LogoMark } from '@/components/kavach/logo';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

/**
 * Desk top bar (Stitch "Live hospital desk"): the mark, "Helping with {name}" with a truthful
 * status chip, the hospital line, the language switch and one End or close control. Under it,
 * in the demo, the scene tabs; and once a session runs, the family with the patient ticked.
 */
export function DeskHeader({
  title,
  subtitle,
  status,
  query,
  action,
  demoScene,
  members,
  patientId,
}: {
  title: string;
  subtitle?: ReactNode;
  /** A small chip next to the title: the real live-socket status, never a claim. */
  status?: ReactNode;
  query?: Record<string, string>;
  /** The close or end control; defaults to nothing. */
  action?: ReactNode;
  /** In the demo, which scene this is: the others are a tap away (from the Stitch desk). */
  demoScene?: DemoScene;
  /** The household, with the admitted member ticked. */
  members?: Member[];
  patientId?: string;
}) {
  const t = useTranslations('desk');
  const tc = useTranslations('common');
  const ts = useTranslations('desk.session.scene');
  const hasSubNav = Boolean(demoScene || (members && members.length > 0));
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2 lg:px-6 lg:py-3">
        <LogoMark className="size-9 shrink-0 lg:size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h1 className="truncate font-display text-lg font-bold leading-tight tracking-tight lg:text-xl">
              {title}
            </h1>
            {status}
          </div>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        <LanguageSwitch query={query} compact className="shrink-0" />
        {action}
      </div>

      {hasSubNav && (
        <div className="border-t border-border bg-bg">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 lg:px-6">
            {demoScene && (
              <nav aria-label={ts('label')} className="flex max-w-full gap-1.5 overflow-x-auto">
                {(['hospital', 'maternity', 'singapore'] as const).map((s) => (
                  <Link
                    key={s}
                    href={{
                      pathname: '/desk',
                      query: { demo: '1', ...(s === 'hospital' ? {} : { scene: s }) },
                    }}
                    aria-current={s === demoScene ? 'page' : undefined}
                    className={cn(
                      'press inline-flex min-h-10 shrink-0 items-center rounded-sm px-3 text-sm font-semibold',
                      s === demoScene
                        ? 'bg-primary text-on-primary'
                        : 'text-muted hover:bg-primary-soft hover:text-primary',
                    )}
                  >
                    {ts(s)}
                  </Link>
                ))}
              </nav>
            )}
            {members && members.length > 0 && (
              <div className="flex max-w-full items-center gap-2 overflow-x-auto text-sm">
                <span className="shrink-0 text-muted">{t('session.admitted')}</span>
                <ul className="flex shrink-0 gap-1 rounded-md bg-sunken p-1">
                  {members.map((m) => {
                    const on = m.id === patientId;
                    return (
                      <li
                        key={m.id}
                        aria-current={on ? 'true' : undefined}
                        className={cn(
                          'inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-sm px-2',
                          on
                            ? 'bg-surface font-bold text-primary shadow-[0_1px_2px_rgba(15,27,61,0.08)]'
                            : 'text-muted',
                        )}
                      >
                        {m.name.split(' ')[0]} ({tc(`relation.${m.relation}`)}, {m.age})
                        {on && <Check aria-hidden className="size-4" strokeWidth={3} />}
                      </li>
                    );
                  })}
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

export function CloseIcon() {
  return <X aria-hidden className="size-6" />;
}
