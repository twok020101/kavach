'use client';

import type { CoverCell } from '@kavach/schemas';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/kavach/icon';
import { cn } from '@/components/ui/cn';

type Status = CoverCell['status'];

/** Stitch status cells: a tinted pill with a hairline of its own colour, an icon and a word. */
export const STATUS_LOOK: Record<Status, { icon: string; tone: string }> = {
  covered: { icon: 'verified', tone: 'border-safe/25 bg-safe-bg text-safe' },
  partial: { icon: 'shield', tone: 'border-partial/25 bg-partial-bg text-partial' },
  contingent: {
    icon: 'work_outline',
    tone: 'border-secondary-container/50 bg-partial-bg text-partial',
  },
  gap: { icon: 'error', tone: 'border-gap/20 bg-gap-bg text-gap' },
  na: {
    icon: 'remove',
    tone: 'border-transparent bg-surface-container-low text-on-surface-variant',
  },
};

/**
 * Cover status as colour + icon + word, never colour alone. `short` uses the one-word form for
 * tight places (assistive tech still hears the full status); `size="sm"` is the inspector header.
 */
export function StatusPill({
  status,
  short = false,
  size = 'md',
  className,
}: {
  status: Status;
  short?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const t = useTranslations('common.status');
  const ts = useTranslations('common.statusShort');
  const { icon, tone } = STATUS_LOOK[status];
  return (
    <span
      // The custom size sits outside cn: tailwind-merge reads `text-body-sm` as a colour.
      className={clsx(
        size === 'sm' ? 'text-xs' : 'text-body-sm',
        cn(
          'inline-flex min-w-0 items-center gap-1 rounded-full border font-medium',
          size === 'sm' ? 'px-2.5 py-0.5' : 'px-3 py-1',
          tone,
          className,
        ),
      )}
    >
      <Icon name={icon} className={size === 'sm' ? 'text-sm' : 'text-base'} />
      {short ? (
        <>
          <span aria-hidden>{ts(status)}</span>
          <span className="sr-only">{t(status)}</span>
        </>
      ) : (
        <span className="min-w-0 [overflow-wrap:anywhere]">{t(status)}</span>
      )}
    </span>
  );
}
