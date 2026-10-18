'use client';

import { Briefcase, Minus, ShieldAlert, ShieldCheck, ShieldHalf } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from './badge';

export type CoverStatus = 'covered' | 'partial' | 'contingent' | 'gap' | 'na';

const look: Record<CoverStatus, { tone: BadgeTone; icon: typeof ShieldCheck }> = {
  covered: { tone: 'safe', icon: ShieldCheck },
  partial: { tone: 'partial', icon: ShieldHalf },
  contingent: { tone: 'partial', icon: Briefcase },
  gap: { tone: 'gap', icon: ShieldAlert },
  na: { tone: 'na', icon: Minus },
};

/**
 * Cover status as colour + icon + word, never colour alone. `short` uses the one-word form
 * for tight grids on a phone; assistive tech still hears the full status.
 */
export function StatusBadge({
  status,
  short = false,
  className,
}: {
  status: CoverStatus;
  short?: boolean;
  className?: string;
}) {
  const t = useTranslations('common.status');
  const ts = useTranslations('common.statusShort');
  const { tone, icon } = look[status];
  return (
    <Badge tone={tone} icon={icon} className={className}>
      {short ? (
        <>
          <span aria-hidden>{ts(status)}</span>
          <span className="sr-only">{t(status)}</span>
        </>
      ) : (
        t(status)
      )}
    </Badge>
  );
}
