'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from '../kavach/language-switch';
import { Logo } from '../kavach/logo';
import { ThemeToggle } from '../kavach/theme-toggle';
import { cn } from '../ui/cn';

export const SETUP_STEPS = 4;

/** Step progress for the four setup steps (family, money, documents, questions). */
export function StepProgress({ step }: { step: number }) {
  const t = useTranslations('setup');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted">{t('step', { step, total: SETUP_STEPS })}</p>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: SETUP_STEPS }, (_, i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i < step ? 'bg-primary' : 'bg-border')}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * One onboarding screen: logo bar, optional step progress, title and intro, content, and a footer
 * with the main action. A single column on a phone; a centred card on a laptop.
 */
export function SetupFrame({
  step,
  back,
  title,
  intro,
  footer,
  children,
}: {
  step?: number;
  back?: string;
  title: ReactNode;
  intro?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const t = useTranslations('setup');
  return (
    <div className="flex min-h-dvh flex-col lg:items-center lg:justify-center lg:bg-sunken lg:py-10">
      <div className="flex w-full flex-1 flex-col lg:max-w-2xl lg:flex-none lg:rounded-lg lg:border lg:border-border lg:bg-bg lg:shadow-sm">
        <header className="flex items-center gap-2 px-4 pt-3 lg:px-8 lg:pt-6">
          {back ? (
            <Link
              href={back}
              aria-label={t('back')}
              className="-ml-2 flex size-11 items-center justify-center rounded-md text-muted hover:bg-sunken"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </Link>
          ) : null}
          <Logo />
          <ThemeToggle className="ml-auto" />
          <LanguageSwitch />
        </header>
        <main id="main" className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
          {step !== undefined && <StepProgress step={step} />}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
            {intro && <p className="text-muted">{intro}</p>}
          </div>
          {children}
        </main>
        {footer && (
          <footer className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:static lg:rounded-b-lg lg:px-8 lg:py-5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
