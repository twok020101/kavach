import { sgTerms } from '@kavach/engine';
import type { Policy } from '@kavach/schemas';
import type { useTranslations } from 'next-intl';
import type { Term } from '@/components/documents/terms';

type T = ReturnType<typeof useTranslations<'plan.sgTerms'>>;

/** True for MediShield Life and Integrated Shield Plans: cover read by the Singapore rules. */
export const isSgKind = (kind: Policy['kind']) =>
  kind === 'medishield_life' || kind === 'integrated_shield';

/**
 * The terms that decide a Singapore claim, in the same shape as the India key terms: the ward
 * the plan pays as charged, the MediShield Life daily limit, the deductible in that ward, the
 * co-insurance, the rider and the policy-year limit. Amounts come from the policy (or the
 * national MediShield Life figures) through the household's money formatter.
 */
export function sgKeyTerms(policy: Policy, t: T, money: (n: number) => string): Term[] {
  const sg = sgTerms(policy);
  if (!sg) return [];
  const ward = sg.wardEntitlement;
  const deductible = sg.deductibleByWard[ward];
  const tiers = sg.coinsurance;
  const first = tiers[0]?.percent;
  const last = tiers.at(-1)?.percent;
  const list: (Term | false)[] = [
    { key: 'ward', label: t('label.ward'), value: t('value.ward', { ward }) },
    sg.dailyWardLimit !== undefined && {
      key: 'dailyWardLimit',
      label: t('label.dailyLimit'),
      value: t('value.perDay', { amount: money(sg.dailyWardLimit) }),
    },
    deductible !== undefined && {
      key: 'deductible',
      label: t('label.deductible'),
      value: t('value.perYear', { amount: money(deductible) }),
    },
    first !== undefined && {
      key: 'coinsurance',
      label: t('label.coinsurance'),
      value:
        last !== undefined && last !== first
          ? t('value.tiers', { from: first, to: last })
          : t('value.percent', { percent: first }),
    },
    !!sg.rider && {
      key: 'rider',
      label: t('label.rider'),
      value: sg.rider.annualCap
        ? t('value.riderCap', {
            percent: sg.rider.copayPercent,
            cap: money(sg.rider.annualCap),
          })
        : t('value.percent', { percent: sg.rider.copayPercent }),
    },
    sg.policyYearLimit !== undefined && {
      key: 'policyYearLimit',
      label: t('label.yearLimit'),
      value: t('value.perYear', { amount: money(sg.policyYearLimit) }),
    },
  ];
  return list.filter((term): term is Term => Boolean(term));
}
