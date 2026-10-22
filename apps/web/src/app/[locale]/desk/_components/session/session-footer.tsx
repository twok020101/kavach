'use client';

import { useTranslations } from 'next-intl';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { useCountry } from '@/lib/country';

/**
 * The status strip under the console: true facts only. The session's own short id, that this is
 * a prototype (with demo data in the demo), and the hospital disclaimer, verbatim.
 */
export function SessionFooter({ sid, demo, open }: { sid: string; demo: boolean; open: boolean }) {
  const t = useTranslations('desk.session');
  const short = sid.split('-')[0];
  // India's desk is the TPA counter; Singapore's is the hospital's insurance counter.
  const disclaimer = useCountry() === 'SG' ? 'hospitalSg' : 'hospital';
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-4 py-3 text-xs text-muted lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <p className="flex items-center gap-2">
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full"
            style={{ background: open ? 'var(--status-safe)' : 'var(--status-na)' }}
          />
          <span>
            {t('footer.session')}: <strong className="font-mono text-text">{short}</strong>
          </span>
          <span aria-hidden>·</span>
          <span>{demo ? t('footer.demo') : t('footer.prototype')}</span>
        </p>
        <DisclaimerBar kind={disclaimer} className="border-0 pt-0 text-xs lg:text-right" />
      </div>
    </footer>
  );
}
