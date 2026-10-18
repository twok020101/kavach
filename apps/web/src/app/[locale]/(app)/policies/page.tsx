'use client';

import type { Household, Policy } from '@kavach/schemas';
import { ChevronRight, Plus } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { isHealth, policyStatus } from '@/components/documents/status';
import { keyTerms, memberNames } from '@/components/documents/terms';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useMoney } from '@/lib/country';
import { useHousehold } from '@/lib/household';

const TONES: Record<ReturnType<typeof policyStatus>, BadgeTone> = {
  active: 'safe',
  ending: 'partial',
  planned: 'primary',
  ended: 'na',
};

/** S14 Policies vault: every policy with the terms that decide a claim. */
export default function PoliciesPage() {
  const t = useTranslations('documents');
  const { data: household, error } = useHousehold();

  if (error) return <p className="rounded-md bg-gap-bg p-3 text-gap">{t('error')}</p>;
  if (!household) return <p className="text-muted">{t('loading')}</p>;

  const health = household.policies.filter(isHealth);
  const other = household.policies.filter((p) => !isHealth(p));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('vault.title')}</h1>
        <p className="text-muted">{t('vault.intro')}</p>
      </header>

      {household.policies.length === 0 && <p className="text-muted">{t('vault.empty')}</p>}

      {[
        { title: t('vault.health'), policies: health },
        { title: t('vault.other'), policies: other },
      ].map(
        (group) =>
          group.policies.length > 0 && (
            <section key={group.title} className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-semibold">{group.title}</h2>
              <ul className="flex flex-col gap-3">
                {group.policies.map((policy) => (
                  <PolicyRow key={policy.id} policy={policy} household={household} />
                ))}
              </ul>
            </section>
          ),
      )}

      <Link href="/setup/documents" className={buttonClasses({ variant: 'secondary' })}>
        <Plus aria-hidden className="size-5" />
        {t('vault.add')}
      </Link>
    </div>
  );
}

function PolicyRow({ policy, household }: { policy: Policy; household: Household }) {
  const t = useTranslations('documents');
  const format = useFormatter();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });
  const status = policyStatus(policy, household);
  // Key terms other than the sum insured, which is on the row already.
  const money = useMoney();
  const terms = isHealth(policy)
    ? keyTerms(policy, t, money).filter((x) => x.key !== 'sumInsured')
    : [];

  return (
    <li>
      <Link
        href={`/policies/${policy.id}`}
        className="press flex flex-col gap-3 rounded-md border border-border bg-surface p-4 hover:border-primary"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-soft font-display text-lg font-bold text-primary-hover"
          >
            {policy.insurer.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-snug">{policy.productName}</p>
            <p className="text-sm text-muted">
              {policy.insurer} · {t(`kindsPolicy.${policy.kind}`)}
            </p>
          </div>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
        </div>
        <p className="amount text-sm">
          {t('policy.sumInsured', { amount: money(policy.sumInsured) })} ·{' '}
          {t('covers', { names: memberNames(household, policy.coveredMemberIds) })}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge tone={TONES[status]} className="text-xs">
            {t(`vault.status.${status}`, { date: date(policy.endDate) })}
          </Badge>
          <Badge className="text-xs">
            {status === 'planned'
              ? t('vault.starts', { date: date(policy.startDate) })
              : t('vault.renews', { date: date(policy.endDate) })}
          </Badge>
          <Badge className="text-xs">
            {t('vault.documents', { count: policy.documentIds?.length ?? 0 })}
          </Badge>
        </div>
        {terms.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {terms.map((term) => (
              <li
                key={term.key}
                className="amount rounded-sm bg-primary-soft px-2 py-0.5 text-xs text-primary-hover"
              >
                {term.label}: {term.value}
              </li>
            ))}
          </ul>
        )}
      </Link>
    </li>
  );
}
