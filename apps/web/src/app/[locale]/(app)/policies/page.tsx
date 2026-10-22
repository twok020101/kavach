'use client';

import type { Household, Policy } from '@kavach/schemas';
import { useFormatter, useTranslations } from 'next-intl';
import {
  EmptyState,
  ListSkeleton,
  PageHeader,
  QueryError,
  sectionTitle,
} from '@/components/app/page-parts';
import { usePolicyKind, usePolicyTerms } from '@/components/app/policy-hooks';
import { isHealth, policyStatus } from '@/components/documents/status';
import { memberNames } from '@/components/documents/terms';
import { Icon } from '@/components/kavach/icon';
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
  const tp = useTranslations('plan');
  const { data: household, error, refetch } = useHousehold();

  if (error && !household) {
    return <QueryError message={t('error')} retryLabel={tp('retry')} onRetry={() => refetch()} />;
  }
  if (!household) {
    return (
      <div className="flex flex-col gap-6" aria-busy aria-label={t('loading')}>
        <PageHeader title={t('vault.title')} intro={t('vault.intro')} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ListSkeleton rows={2} rowClassName="h-56" />
          <ListSkeleton rows={2} rowClassName="h-56" className="max-lg:hidden" />
        </div>
      </div>
    );
  }

  const health = household.policies.filter(isHealth);
  const other = household.policies.filter((p) => !isHealth(p));
  const addDocument = (
    <Link href="/setup/documents" className={buttonClasses({ variant: 'secondary' })}>
      <Icon name="add" className="text-xl" />
      {t('vault.add')}
    </Link>
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('vault.title')}
        intro={t('vault.intro')}
        aside={household.policies.length > 0 ? addDocument : undefined}
      />

      {household.policies.length === 0 && (
        <EmptyState icon="description" title={t('vault.empty')} action={addDocument} />
      )}

      {[
        { id: 'health', title: t('vault.health'), policies: health },
        { id: 'other', title: t('vault.other'), policies: other },
      ].map(
        (group) =>
          group.policies.length > 0 && (
            <section
              key={group.id}
              aria-labelledby={`vault-${group.id}`}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
                <h2 id={`vault-${group.id}`} className={sectionTitle}>
                  {group.title}
                </h2>
                <span className="text-body-sm text-on-surface-variant">
                  {t('vault.count', { count: group.policies.length })}
                </span>
              </div>
              <ul className="grid gap-4 lg:grid-cols-2">
                {group.policies.map((policy) => (
                  <PolicyRow key={policy.id} policy={policy} household={household} />
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  );
}

function PolicyRow({ policy, household }: { policy: Policy; household: Household }) {
  const t = useTranslations('documents');
  const format = useFormatter();
  const kind = usePolicyKind();
  const allTerms = usePolicyTerms();
  const money = useMoney();
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });
  const status = policyStatus(policy, household);
  // Key terms other than the sum insured, which is the card's big figure already.
  const terms = isHealth(policy) ? allTerms(policy).filter((x) => x.key !== 'sumInsured') : [];

  return (
    <li className="h-full">
      <Link
        href={`/policies/${policy.id}`}
        className="group lift press flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-1 hover:border-primary/50 sm:p-6"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-primary"
          >
            <Icon
              name={isHealth(policy) ? 'health_and_safety' : 'shield'}
              className="text-[22px]"
            />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="font-display text-title-md text-on-surface transition-colors group-hover:text-primary">
              {policy.productName}
            </span>
            <span className="text-body-sm text-on-surface-variant">
              {policy.insurer} · {kind(policy.kind)}
            </span>
          </div>
          <Icon
            name="chevron_right"
            className="nudge text-2xl text-outline group-hover:text-primary"
          />
          {/* The cover as the big figure, who it covers under it (plan card). */}
          <div className="col-span-2 col-start-2 flex flex-col">
            <span className="font-display text-numeral-lg text-on-surface">
              {money(policy.sumInsured)}
            </span>
            <span className="text-body-sm text-on-surface-variant">
              {t('covers', { names: memberNames(household, policy.coveredMemberIds) })}
            </span>
          </div>
        </div>
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
          <dl className="mt-auto grid grid-cols-1 gap-x-4 gap-y-2 border-t border-border pt-4 sm:grid-cols-2">
            {terms.map((term) => (
              <div key={term.key} className="flex min-w-0 flex-col">
                <dt className="text-label-caps uppercase text-on-surface-variant [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal">
                  {term.label}
                </dt>
                <dd className="text-body-sm text-on-surface">{term.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Link>
    </li>
  );
}
