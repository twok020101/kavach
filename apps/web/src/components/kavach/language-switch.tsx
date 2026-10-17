'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '../ui/cn';

const labels: Record<string, string> = { en: 'EN', hi: 'हिं' };

/** EN | हिं segmented control. Keeps the current page (and `query`, if given). */
export function LanguageSwitch({
  query,
  compact = false,
  className,
}: {
  query?: Record<string, string>;
  /** Smaller for the phone top bar. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('language')}
      className={cn('inline-flex rounded-sm border border-border bg-surface p-0.5', className)}
    >
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={{ pathname, query }}
          locale={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          className={cn(
            'press flex items-center justify-center rounded-sm font-semibold',
            compact ? 'min-h-9 min-w-10 px-2 text-xs' : 'min-h-11 min-w-12 px-3 text-sm',
            l === locale ? 'bg-primary-soft text-primary-hover' : 'text-muted hover:text-text',
          )}
        >
          <span className="sr-only">{t(`languages.${l}`)}</span>
          <span aria-hidden>{labels[l]}</span>
        </Link>
      ))}
    </nav>
  );
}
