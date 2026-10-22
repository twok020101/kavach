'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { usePolicyKind, usePolicyTerms } from '@/components/app/policy-hooks';
import {
  appCard,
  EmptyState,
  ListSkeleton,
  PageHeader,
  QueryError,
  sectionTitle,
} from '@/components/app/page-parts';
import { openDocumentFile } from '@/components/documents/api';
import { isHealth } from '@/components/documents/status';
import { TermList } from '@/components/documents/TermList';
import { memberNames } from '@/components/documents/terms';
import { Icon } from '@/components/kavach/icon';
import { Button, buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { useMoney } from '@/lib/country';
import { useHousehold } from '@/lib/household';

/** S15 Policy detail: the key terms, each with the clause it comes from. */
export default function PolicyPage() {
  const t = useTranslations('documents');
  const tp = useTranslations('plan');
  const money = useMoney();
  const format = useFormatter();
  const kind = usePolicyKind();
  const policyTerms = usePolicyTerms();
  const { id } = useParams<{ id: string }>();
  const { data: household, error, refetch } = useHousehold();

  const back = (
    <Link
      href="/policies"
      className="-ml-2 mb-1 flex min-h-12 items-center gap-1 self-start rounded-md px-2 text-body-sm font-semibold text-primary hover:bg-surface-container-low"
    >
      <Icon name="arrow_back" className="text-lg" />
      {t('vault.title')}
    </Link>
  );

  if (error && !household) {
    return <QueryError message={t('error')} retryLabel={tp('retry')} onRetry={() => refetch()} />;
  }
  if (!household) {
    return (
      <div className="flex max-w-3xl flex-col gap-6" aria-busy aria-label={t('loading')}>
        {back}
        <ListSkeleton rows={2} rowClassName="h-40" />
      </div>
    );
  }

  const policy = household.policies.find((p) => p.id === id);
  if (!policy) {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        {back}
        <EmptyState icon="search_off" title={t('policy.notFound')} />
      </div>
    );
  }

  const terms = isHealth(policy)
    ? policyTerms(policy)
    : policyTerms(policy).filter((x) => x.key === 'sumInsured');
  const documentId = policy.documentIds?.at(-1);
  const date = format.dateTime(new Date(policy.endDate), { dateStyle: 'medium' });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        back={back}
        title={policy.productName}
        intro={
          <>
            {policy.insurer} · {kind(policy.kind)}
            {policy.uin && ` · UIN ${policy.uin}`}
          </>
        }
      />

      {/* The facts on one strip: who, how much, till when, what it costs. */}
      <div className="grid grid-cols-1 gap-4 rounded-lg bg-surface-container-low p-5 sm:grid-cols-2 sm:items-center">
        <p className="flex flex-col gap-0.5">
          <span className="text-body-sm text-on-surface-variant">{t('facts.sumInsured')}</span>
          <span className="font-display text-numeral-lg text-on-surface">
            {money(policy.sumInsured)}
          </span>
        </p>
        <p className="flex flex-col gap-0.5">
          <span className="text-body-md text-on-surface">
            {t('policy.covers', { names: memberNames(household, policy.coveredMemberIds) })}
          </span>
          <span className="text-body-sm text-on-surface-variant">
            {t('policy.validTill', { date })}
            {policy.premiumAnnual &&
              ` · ${t('policy.premium', { amount: money(policy.premiumAnnual) })}`}
          </span>
        </p>
      </div>

      <section aria-labelledby="key-terms" className={`${appCard} flex flex-col gap-2`}>
        <h2 id="key-terms" className={sectionTitle}>
          {t('policy.keyTerms')}
        </h2>
        <TermList terms={terms} householdId={household.id} />
        {!documentId && (
          <p className="text-body-sm text-on-surface-variant">{t('policy.noDocument')}</p>
        )}
      </section>

      {documentId ? (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => openDocumentFile(household.id, documentId)}
        >
          <Icon name="open_in_new" className="text-xl" />
          {t('policy.openDocument')}
        </Button>
      ) : (
        <Link
          href="/setup/documents"
          className={buttonClasses({ variant: 'secondary', className: 'self-start' })}
        >
          <Icon name="add" className="text-xl" />
          {t('vault.add')}
        </Link>
      )}
    </div>
  );
}
