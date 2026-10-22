'use client';

import { ArrowLeft, FileWarning, GitBranch, Hospital, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitch } from '../kavach/language-switch';
import { Logo, LogoMark } from '../kavach/logo';
import { Reveal } from '../kavach/reveal';
import { ThemeToggle } from '../kavach/theme-toggle';
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
            <span className="h-1.5 overflow-hidden rounded-sm bg-border">
              <i
                className={cn(
                  'block h-full origin-left bg-primary transition-transform duration-500 ease-[var(--ease-out-strong)]',
                  state === 'todo' ? 'scale-x-0' : 'scale-x-100',
                )}
              />
            </span>
            <span
              className={cn(
                'truncate text-xs font-medium',
                state === 'current' ? 'text-primary-hover' : 'text-muted',
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
 * One onboarding screen: logo bar, optional step progress, title and intro, content, and a footer
 * with the main action. A single column on a phone; on a laptop a brand panel on the left tells
 * the three moments while the form sits on the right.
 */
export function SetupFrame({
  step,
  back,
  title,
  intro,
  footer,
  stickyFooter = false,
  children,
}: {
  step?: number;
  back?: string;
  title: ReactNode;
  intro?: ReactNode;
  footer?: ReactNode;
  /** Keep the footer pinned on a laptop too (long lists such as consent), with its hairline. */
  stickyFooter?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations('setup');
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <BrandPanel />
      <div className="relative flex w-full flex-1 flex-col lg:items-center lg:justify-center lg:py-10">
        <div className="flex w-full flex-1 flex-col lg:max-w-xl lg:flex-none">
          <header className="flex items-center gap-2 px-4 pt-3 lg:absolute lg:inset-x-0 lg:top-0 lg:px-8 lg:pt-5">
            {back ? (
              <Link
                href={back}
                aria-label={t('back')}
                className="press -ml-2 flex size-11 items-center justify-center rounded-md text-muted hover:bg-sunken"
              >
                <ArrowLeft aria-hidden className="size-5" />
              </Link>
            ) : null}
            {/* Below sm the mark alone, so a five-language switch still fits beside it */}
            <Link href="/" className="lg:hidden" aria-label="Kavach">
              <LogoMark className="size-7 sm:hidden" />
              <span className="hidden sm:block">
                <Logo />
              </span>
            </Link>
            <ThemeToggle className="ml-auto shrink-0" />
            <LanguageSwitch compact className="shrink-0" />
          </header>
          <main id="main" className="flex flex-1 flex-col gap-6 px-4 py-6 lg:px-8">
            {step !== undefined && <StepProgress step={step} />}
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {title}
              </h1>
              {intro && <p className="text-lg text-muted">{intro}</p>}
            </div>
            {children}
          </main>
          {footer && (
            <footer
              className={cn(
                'sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-bg px-4 py-3 lg:px-8',
                stickyFooter ? 'lg:py-4' : 'lg:static lg:border-0 lg:bg-transparent lg:py-5',
              )}
            >
              {footer}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}

/** The left panel on a laptop: the mark, the promise, and the three moments. */
function BrandPanel() {
  const t = useTranslations('setup.brand');
  const moments = [
    { icon: GitBranch, key: 'change' },
    { icon: Hospital, key: 'hospital' },
    { icon: FileWarning, key: 'claim' },
  ] as const;
  return (
    <aside className="relative hidden w-[42%] max-w-xl flex-col justify-between overflow-hidden bg-primary p-10 text-on-primary lg:flex">
      {/* The mark, large and quiet, behind the words: the shield that holds the family. */}
      <LogoMark className="pointer-events-none absolute -bottom-20 -right-16 size-[26rem] opacity-[0.12]" />
      <Link href="/" className="relative inline-flex items-center gap-3" aria-label="Kavach">
        <span className="rounded-md bg-surface p-1.5">
          <LogoMark className="size-8" />
        </span>
        <span className="font-display text-2xl font-bold">Kavach</span>
      </Link>
      <div className="relative flex flex-col gap-8">
        <Reveal as="div" className="flex max-w-md flex-col gap-4">
          <p className="font-display text-4xl font-bold leading-tight tracking-tight">
            {t('tagline')}
          </p>
          <p className="text-lg leading-relaxed opacity-85">{t('lead')}</p>
        </Reveal>
        {/* The three moments as tiles on the panel (from the Stitch sign-in): a round icon, the
            moment, one line on what Kavach does there. The hospital keeps the marigold. */}
        <ul className="flex max-w-md flex-col gap-3">
          {moments.map(({ icon: Icon, key }, i) => (
            <Reveal
              as="li"
              key={key}
              delay={0.08 + i * 0.06}
              className="flex items-start gap-4 rounded-md bg-white/10 p-4"
            >
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  key === 'hospital' ? 'bg-accent text-accent-ink' : 'bg-white/20 text-on-primary',
                )}
              >
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{t(`${key}.title`)}</span>
                <span className="mt-0.5 block text-sm opacity-80">{t(`${key}.body`)}</span>
              </span>
            </Reveal>
          ))}
        </ul>
      </div>
      <p className="relative flex items-start gap-2 border-t border-white/20 pt-6 text-sm opacity-80">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{t('promise')}</span>
      </p>
    </aside>
  );
}
