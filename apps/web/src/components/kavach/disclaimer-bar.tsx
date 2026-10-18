'use client';

import { useTranslations } from 'next-intl';
import { cn } from '../ui/cn';

export type DisclaimerKind = 'global' | 'plan' | 'hospital' | 'claims';

/** The thin disclaimer bar of 07 §8, with the copy of 11 §4 verbatim. Client, so screens can place it. */
export function DisclaimerBar({ kind, className }: { kind: DisclaimerKind; className?: string }) {
  const t = useTranslations('common.disclaimer');
  return (
    <p className={cn('border-t border-border pt-3 text-sm text-muted', className)}>{t(kind)}</p>
  );
}
