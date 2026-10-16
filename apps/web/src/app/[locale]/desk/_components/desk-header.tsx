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
      <div className="mx-auto max-w-2xl px-4 py-2">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7 shrink-0" />
          <LanguageSwitch query={query} className="ml-auto" />
          {action}
        </div>
        <h1 className="mt-1 font-display text-xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <p className="sr-only">{t('modeNote')}</p>
    </header>
  );
}

export function CloseIcon() {
  return <X aria-hidden className="size-6" />;
}
