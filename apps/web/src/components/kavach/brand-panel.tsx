'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '../ui/cn';
import { Icon } from './icon';
import { LanguageSwitch } from './language-switch';
import { LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';

const MOMENTS = [
  { key: 'change', icon: 'family_restroom' },
  { key: 'hospital', icon: 'local_hospital' },
  { key: 'claim', icon: 'gavel' },
] as const;

/** The mark on a white tile, कवच Kavach, and the eyebrow under it (Stitch brand header). */
export function BrandLockup({ className }: { className?: string }) {
  const t = useTranslations('common.brandPanel');
  return (
    <Link href="/" aria-label="Kavach" className={cn('inline-flex items-center gap-3', className)}>
      <span className="flex size-12 items-center justify-center rounded-md bg-white p-1 shadow-1">
        <LogoMark className="size-10" />
      </span>
      <span className="flex flex-col">
        <span className="font-display text-2xl font-bold leading-tight tracking-tight">
          <span lang="hi" className="mr-1">
            {t('deva')}
          </span>
          Kavach
        </span>
        <span className="text-label-caps uppercase text-white/85">{t('eyebrow')}</span>
      </span>
    </Link>
  );
}

/**
 * The always-indigo left half of the gateway, loader, sign-in and consent screens (Stitch):
 * the brand, a chip, the promise, the three moments as glass tiles, and the DPDP line.
 */
export function BrandPanel({ className }: { className?: string }) {
  const t = useTranslations('common.brandPanel');
  return (
    <aside
      className={cn(
        'brand-panel relative hidden flex-col overflow-hidden px-10 py-10 lg:sticky lg:top-0 lg:flex lg:h-dvh xl:px-12',
        className,
      )}
    >
      {/* The mark, large and quiet, behind the words. */}
      <LogoMark className="pointer-events-none absolute -bottom-24 -right-24 size-[28rem] opacity-[0.06] grayscale invert" />
      <BrandLockup className="relative" />

      <div className="relative mt-12 flex max-w-xl flex-col gap-6">
        <span className="rise-in inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-label-caps uppercase">
          <Icon name="verified_user" className="text-sm" />
          {t('chip')}
        </span>
        <h2
          className="rise-in font-display text-[2.75rem] font-bold leading-[1.12] tracking-[-0.025em] xl:text-5xl xl:leading-[1.1]"
          style={{ '--i': 1 } as CSSProperties}
        >
          {t('tagline')}
        </h2>
        <p
          className="rise-in text-body-lg text-white/85 xl:text-xl xl:leading-8"
          style={{ '--i': 2 } as CSSProperties}
        >
          {t('lead')}
        </p>
      </div>

      <ul className="relative mt-10 flex max-w-xl flex-col gap-4">
        {MOMENTS.map(({ key, icon }, i) => (
          <li
            key={key}
            className="brand-tile rise-in flex items-start gap-4 p-5"
            style={{ '--i': 3 + i } as CSSProperties}
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Icon name={icon} className="text-2xl" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-headline-sm">{t(`${key}.title`)}</span>
              <span className="mt-1 block text-body-md text-white/80">{t(`${key}.body`)}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="relative mt-auto flex items-start gap-2 border-t border-white/15 pt-6 font-serif text-citation-md text-white/80">
        <Icon name="lock" className="mt-0.5 text-base" />
        <span>{t('footer')}</span>
      </p>
    </aside>
  );
}

/** The slim indigo band that stands in for the brand panel on a phone. */
export function BrandBand() {
  const t = useTranslations('common.brandPanel');
  return (
    <div className="brand-panel flex flex-col gap-3 rounded-b-xl px-4 pb-5 pt-4 lg:hidden">
      <BrandLockup />
      <p className="font-display text-xl font-bold leading-snug">{t('tagline')}</p>
    </div>
  );
}

/**
 * The split layout of the Stitch auth screens: the brand panel on the left half of a laptop, and
 * on the right a top bar (Back, language, theme) above the content. On a phone the panel becomes
 * a band at the top.
 */
export function SplitFrame({
  back,
  backLabel,
  band = true,
  children,
  className,
}: {
  /** Where Back goes; omit to hide it. */
  back?: string;
  backLabel?: string;
  /** Show the indigo band on a phone. */
  band?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const tc = useTranslations('common');
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-2">
      <BrandPanel />
      <div className="flex min-w-0 flex-col">
        {band && <BrandBand />}
        <header className="flex items-center gap-2 px-4 py-3 lg:border-b lg:border-border/70 lg:px-12 lg:py-5">
          {back ? (
            <Link
              href={back}
              className="press -ml-2 inline-flex min-h-11 items-center gap-2 rounded-md px-2 font-medium text-on-surface hover:bg-surface-container-low"
            >
              <Icon name="arrow_back" className="text-xl" />
              {backLabel ?? tc('back')}
            </Link>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </header>
        <div className={cn('flex flex-1 flex-col px-4 pb-10 pt-2 lg:px-10 lg:py-10', className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
