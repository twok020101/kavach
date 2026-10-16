'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '../ui/cn';

const labels: Record<string, string> = { en: 'EN', hi: 'हिं' };

/** EN | हिं segmented control. Keeps the current page (and `query`, if given). */
export function LanguageSwitch({
  query,
  className,
}: {
  query?: Record<string, string>;
  className?: string;
}) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t('language')}
      className={cn('inline-flex rounded-md border border-border-strong p-0.5', className)}
    >
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={{ pathname, query }}
          locale={l}
          lang={l}
          aria-current={l === locale ? 'true' : undefined}
          className={cn(
            'flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 text-sm font-semibold',
            l === locale ? 'bg-primary text-on-primary' : 'text-text hover:bg-primary-soft',
          )}
        >
          <span className="sr-only">{t(`languages.${l}`)}</span>
          <span aria-hidden>{labels[l]}</span>
        </Link>
      ))}
    </nav>
  );
}
