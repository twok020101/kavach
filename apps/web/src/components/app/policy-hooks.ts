'use client';

import type { Policy } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { keyTerms } from '@/components/documents/terms';
import { useMoney } from '@/lib/country';
import { isSgKind, sgKeyTerms } from './sg-terms';

/** "Employer health", or the Singapore scheme's own name (MediShield Life, Integrated Shield Plan). */
export function usePolicyKind() {
  const t = useTranslations('documents');
  const tp = useTranslations('plan');
  return (kind: Policy['kind']) =>
    isSgKind(kind)
      ? tp(`policyKind.${kind as 'medishield_life' | 'integrated_shield'}`)
      : t(`kindsPolicy.${kind as 'group_health'}`);
}

/**
 * The terms that decide a claim: Singapore's ward, deductible and rider, or India's room rent,
 * proportionate deduction and co-pay. The sum insured comes first in both.
 */
export function usePolicyTerms() {
  const t = useTranslations('documents');
  const ts = useTranslations('plan.sgTerms');
  const money = useMoney();
  return (policy: Policy) => {
    if (!isSgKind(policy.kind)) return keyTerms(policy, t, money);
    const sumInsured = keyTerms(policy, t, money).filter((x) => x.key === 'sumInsured');
    return [...sumInsured, ...sgKeyTerms(policy, ts, money)];
  };
}
