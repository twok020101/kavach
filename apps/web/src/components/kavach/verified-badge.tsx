'use client';

import { BadgeCheck, CircleDashed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';

/** ✓ when every number came from a verified rule; otherwise "check with insurer". */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  const t = useTranslations('common');
  return verified ? (
    <Badge tone="safe" icon={BadgeCheck}>
      {t('verified')}
    </Badge>
  ) : (
    <Badge tone="partial" icon={CircleDashed}>
      {t('toVerify')}
    </Badge>
  );
}

/** A rule ID such as R-HL-001, in mono. */
export function RuleId({ id }: { id: string }) {
  return (
    <span className="rounded-sm border border-border bg-sunken px-1.5 py-0.5 font-mono text-xs text-muted">
      {id}
    </span>
  );
}
