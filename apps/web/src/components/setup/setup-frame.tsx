'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { SplitFrame } from '../kavach/brand-panel';
import { cn } from '../ui/cn';

export const SETUP_STEPS = 4;
const STEP_KEYS = ['family', 'money', 'documents', 'questions'] as const;

/** Step progress for the four setup steps (family, money, documents, questions), with names. */
export function StepProgress({ step }: { step: number }) {
  const t = useTranslations('setup');
  return (
    <ol className="flex gap-1.5" aria-label={t('step', { step, total: SETUP_STEPS })}>
      {STEP_KEYS.map((key, i) => {
        const n = i + 1;
        const state = n < step ? 'done' : n === step ? 'current' : 'todo';
        return (
          <li
            key={key}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex flex-1 flex-col gap-1.5"
          >
            {/* Each bar fills from the left as the step is reached (transform only, 500 ms). */}
            <span className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <i
                className={cn(
                  'block h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-[var(--ease-out-strong)]',
                  state === 'todo' ? 'scale-x-0' : 'scale-x-100',
                )}
              />
            </span>
            <span
              className={cn(
                'truncate text-xs font-semibold uppercase tracking-[0.06em]',
                state === 'current' ? 'text-primary' : 'text-on-surface-variant',
              )}
            >
              {t(`stepNames.${key}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One onboarding screen in the Stitch split layout: the indigo brand panel on the left of a
 * laptop (a band on a phone), and on the right the Back / language / theme bar above an optional
 * top row (chips), the step progress, the title and intro, the content, and a footer with the
 * main action. The footer stays pinned on a phone; `stickyFooter` pins it on a laptop too.
 */
export function SetupFrame({
  step,
  back,
  top,
  title,
  intro,
  footer,
  stickyFooter = false,
  children,
}: {
  step?: number;
  back?: string;
  /** A row above the title, e.g. the consent chips. */
  top?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  footer?: ReactNode;
  /** Keep the footer pinned on a laptop too (long lists such as consent), with its hairline. */
  stickyFooter?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('setup');
  return (
    <SplitFrame back={back} backLabel={t('back')} className="pb-0 lg:pb-0">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
        <main id="main" className="flex flex-1 flex-col gap-6 pb-8 pt-4 lg:pt-6">
          {top}
          {step !== undefined && <StepProgress step={step} />}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[1.75rem] font-bold leading-9 tracking-[-0.015em] text-on-surface sm:text-headline-lg">
              {title}
            </h1>
            {intro && <p className="max-w-xl text-body-lg text-on-surface-variant">{intro}</p>}
          </div>
          {children}
        </main>
        {footer && (
          <footer
            className={cn(
              'glass sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-3 border-t border-border px-4 py-3 lg:mx-0 lg:px-0',
              stickyFooter
                ? 'lg:pb-6 lg:pt-4'
                : 'lg:static lg:border-0 lg:bg-transparent lg:pb-10 lg:pt-2',
            )}
          >
            {footer}
          </footer>
        )}
      </div>
    </SplitFrame>
  );
}
