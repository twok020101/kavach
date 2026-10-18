'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { isDark, useAppearance } from '@/lib/theme';
import { cn } from '../ui/cn';

/**
 * Quick light/dark switch for the top bar; Settings also offers "same as my phone". The moon
 * turns into the sun and back (`.theme-icons` in globals.css), without waiting for React.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('settings.appearance');
  const { setTheme } = useAppearance();
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark() ? 'light' : 'dark')}
      aria-label={t('toggle')}
      className={cn(
        'press flex size-11 items-center justify-center rounded-md text-muted hover:bg-primary-soft hover:text-text',
        className,
      )}
    >
      <span className="theme-icons" aria-hidden>
        <Moon className="icon-moon size-5" />
        <Sun className="icon-sun size-5" />
      </span>
    </button>
  );
}
