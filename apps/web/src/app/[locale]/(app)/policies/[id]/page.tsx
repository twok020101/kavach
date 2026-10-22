'use client';

import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { openDocumentFile } from '@/components/documents/api';
import { isHealth } from '@/components/documents/status';
import { TermList } from '@/components/documents/TermList';
import { keyTerms, memberNames } from '@/components/documents/terms';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { useMoney } from '@/lib/country';
import { useHousehold } from '@/lib/household';

/** S15 Policy detail: the key terms, each with the clause it comes from. */
export default function PolicyPage() {
  const t = useTranslations('documents');
  const money = useMoney();
  const format = useFormatter();
  const { id } = useParams<{ id: string }>();
  const { data: household, error } = useHousehold();

  if (error) return <p className="rounded-md bg-gap-bg p-3 text-gap">{t('error')}</p>;
  if (!household) return <p className="text-muted">{t('loading')}</p>;

  const policy = household.policies.find((p) => p.id === id);
  const back = (
    <Link href="/policies" className="flex items-center gap-1 text-sm font-medium text-primary">
      <ArrowLeft aria-hidden className="size-4" />
      {t('vault.title')}
    </Link>
  );
  if (!policy) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <p className="text-muted">{t('policy.notFound')}</p>
      </div>
    );
  }

  const terms = isHealth(policy)
    ? keyTerms(policy, t, money)
    : keyTerms(policy, t, money).filter((x) => x.key === 'sumInsured');
  const documentId = policy.documentIds?.at(-1);
  const date = format.dateTime(new Date(policy.endDate), { dateStyle: 'medium' });

  return (
    <div className="flex flex-col gap-5">
      {back}
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">{policy.productName}</h1>
        <p className="text-muted">
          {policy.insurer}
          {policy.uin && ` · UIN ${policy.uin}`}
        </p>
        <p className="amount">
          {t('policy.covers', { names: memberNames(household, policy.coveredMemberIds) })} ·{' '}
          {t('policy.sumInsured', { amount: money(policy.sumInsured) })}
        </p>
        <p className="amount text-sm text-muted">
          {t('policy.validTill', { date })}
          {policy.premiumAnnual &&
            ` · ${t('policy.premium', { amount: money(policy.premiumAnnual) })}`}
        </p>
      </header>

      <Card as="section" className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-semibold">{t('policy.keyTerms')}</h2>
        <TermList terms={terms} householdId={household.id} />
        {!documentId && <p className="text-sm text-muted">{t('policy.noDocument')}</p>}
      </Card>

      {documentId ? (
        <Button variant="secondary" onClick={() => openDocumentFile(household.id, documentId)}>
          <ExternalLink aria-hidden className="size-4" />
          {t('policy.openDocument')}
        </Button>
      ) : (
        <Link href="/setup/documents" className="text-center font-medium text-primary underline">
          {t('vault.add')}
        </Link>
      )}
    </div>
  );
}
