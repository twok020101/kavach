'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { LogoMark } from '@/components/kavach/logo';

/** Desk top bar: title, language switch and one close/end control. */
export function DeskHeader({
  title,
  subtitle,
  query,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  query?: Record<string, string>;
  /** The close or end control; defaults to nothing. */
  action?: ReactNode;
}) {
  const t = useTranslations('desk');
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
      </div>
      <p className="sr-only">{t('modeNote')}</p>
    </header>
  );
}

export function CloseIcon() {
  return <X aria-hidden className="size-6" />;
}
