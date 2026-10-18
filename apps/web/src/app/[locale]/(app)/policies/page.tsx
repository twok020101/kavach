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
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {t('vault.title')}
        </h1>
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
              {/* Section heads and cards in the plan's card language (Stitch plan screen). */}
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <span aria-hidden className="size-2 shrink-0 rounded-full bg-primary" />
                  {group.title}
                </h2>
                <span className="text-sm text-muted">
                  {t('vault.count', { count: group.policies.length })}
                </span>
              </div>
              <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
                {group.policies.map((policy) => (
                  <PolicyRow key={policy.id} policy={policy} household={household} />
                ))}
              </ul>
            </section>
          ),
      )}

      <Link
        href="/setup/documents"
        className={buttonClasses({ variant: 'secondary', className: 'self-start' })}
      >
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
    <li className="h-full">
      <Link
        href={`/policies/${policy.id}`}
        className="press flex h-full flex-col gap-4 rounded-md border border-border bg-surface p-4 shadow-1 hover:border-primary sm:p-6"
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 sm:gap-x-4">
          <span
            aria-hidden
            className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft font-display text-lg font-bold text-primary-hover"
          >
            {policy.insurer.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="font-display font-semibold leading-snug">{policy.productName}</p>
            <p className="text-sm text-muted">
              {policy.insurer} · {t(`kindsPolicy.${policy.kind}`)}
            </p>
          </div>
          <ChevronRight aria-hidden className="mt-1 size-5 shrink-0 text-muted" />
          {/* The cover as the big figure, who it covers under it (plan card). */}
          <div className="col-span-2 col-start-2 flex flex-col">
            <span className="amount font-display text-2xl font-bold tracking-tight">
              {money(policy.sumInsured)}
            </span>
            <span className="text-sm text-muted">
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
          <ul className="flex flex-wrap gap-1.5 border-t border-border pt-3">
            {terms.map((term) => (
              <li
                key={term.key}
                className="amount rounded-sm bg-sunken px-2 py-1 text-xs text-muted"
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
