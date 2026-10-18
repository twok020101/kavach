'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import type { DemoScene } from '@/lib/desk-client';
import { LogoMark } from '@/components/kavach/logo';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';

/** Desk top bar: title, language switch and one close/end control. */
export function DeskHeader({
  title,
  subtitle,
  query,
  action,
  demoScene,
}: {
  title: string;
  subtitle?: ReactNode;
  query?: Record<string, string>;
  /** The close or end control; defaults to nothing. */
  action?: ReactNode;
  /** In the demo, which scene this is: the others are a tap away (from the Stitch desk). */
  demoScene?: DemoScene;
}) {
  const t = useTranslations('desk');
  const ts = useTranslations('desk.session.scene');
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg">
      <div className="mx-auto flex max-w-2xl flex-col gap-1 px-4 py-2 lg:max-w-6xl lg:px-6 lg:py-3">
        <div className="flex items-center gap-2">
          <LogoMark className="size-8 shrink-0" />
          <h1 className="hidden min-w-0 flex-1 truncate font-display text-lg font-bold sm:block">
            {title}
          </h1>
          <LanguageSwitch query={query} compact className="ml-auto" />
          {action}
        </div>
        <h1 className="font-display text-lg font-bold leading-tight sm:hidden">{title}</h1>
        {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        {demoScene && (
          <nav aria-label={ts('label')} className="hidden gap-2 pt-1 sm:flex">
            {(['hospital', 'maternity', 'singapore'] as const).map((s) => (
              <Link
                key={s}
                href={{
                  pathname: '/desk',
                  query: { demo: '1', ...(s === 'hospital' ? {} : { scene: s }) },
                }}
                aria-current={s === demoScene ? 'page' : undefined}
                className={cn(
                  'press inline-flex min-h-9 items-center rounded-sm px-3 text-sm font-semibold',
                  s === demoScene
                    ? 'bg-primary text-on-primary'
                    : 'bg-sunken text-muted hover:bg-primary-soft hover:text-primary',
                )}
              >
                {ts(s)}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <p className="sr-only">{t('modeNote')}</p>
    </header>
  );
}

export function CloseIcon() {
  return <X aria-hidden className="size-6" />;
}
