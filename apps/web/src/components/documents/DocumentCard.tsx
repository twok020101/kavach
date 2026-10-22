'use client';

import { formatMoney } from '@kavach/engine';
import type { DocumentRecord, Household } from '@kavach/schemas';
import { Check, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { AgentSteps } from '../kavach/agent-steps';
import { Icon } from '../kavach/icon';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { useConfirmDocument } from './api';
import { ClauseChip } from './ClauseSheet';
import { TermList } from './TermList';
import { keyTerms, memberNames } from './terms';

const STEPS = ['reading_pages', 'matching_family', 'linking_clauses'] as const;

/** One uploaded document on S07: reading progress, then what was found and Confirm. */
export function DocumentCard({
  document,
  household,
}: {
  document: DocumentRecord;
  household: Household;
}) {
  const t = useTranslations('documents');
  // Amounts in the household's own currency (₹ for India, S$ for Singapore), whatever the page.
  const money = (amount: number) => formatMoney(amount, household.country);
  const confirm = useConfirmDocument(household.id);
  const extraction = document.extraction;
  const policy = extraction?.policy;

  return (
    <Card as="article" className="flex flex-col gap-4">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <FileText aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-display text-title-md text-on-surface"
            title={document.filename}
          >
            {document.filename}
          </h3>
          {document.status === 'read' && (
            <p className="text-body-sm text-on-surface-variant">{t(`kinds.${document.kind}`)}</p>
          )}
        </div>
        {document.isSample && (
          <Badge tone="partial" className="text-label-caps uppercase">
            {t('sample')}
          </Badge>
        )}
      </header>

      {(document.status === 'uploaded' || document.status === 'reading') && (
        <ReadingSteps document={document} />
      )}

      {document.status === 'failed' && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-gap-bg p-3 text-body-md text-gap"
        >
          <Icon name="error" className="mt-0.5 text-lg" />
          {t('failed', { error: document.error ?? '' })}
        </p>
      )}

      {extraction && policy && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <p className="font-display text-title-md text-on-surface">{policy.productName}</p>
            <p className="text-body-sm text-on-surface-variant">{policy.insurer}</p>
            <p className="text-body-sm text-on-surface-variant">
              {t('covers', {
                names: memberNames(
                  household,
                  extraction.insuredPersons.map((p) => p.memberId ?? p.name),
                ),
              })}
            </p>
          </div>
          <h4 className="text-label-caps uppercase text-on-surface-variant">{t('check')}</h4>
          <TermList terms={keyTerms(policy, t, money)} householdId={household.id} />
        </div>
      )}

      {extraction && !policy && (
        <div className="flex flex-col gap-2">
          {extraction.summary && (
            <p className="line-clamp-4 max-w-[70ch] text-body-md text-on-surface">
              {extraction.summary}
            </p>
          )}
          {extraction.citations.map((citation) => (
            <p
              key={citation.quote}
              className="flex items-start gap-2 text-body-sm text-on-surface-variant"
            >
              <span className="flex-1 font-serif">“{citation.quote}”</span>
              <ClauseChip citation={citation} householdId={household.id} />
            </p>
          ))}
        </div>
      )}

      {policy &&
        (document.confirmedPolicyId ? (
          <p className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-safe-bg px-3 py-1 text-body-md text-safe">
            <span className="flex items-center gap-1.5">
              <Check aria-hidden className="size-4" />
              {t('confirmed')}
            </span>
            <Link
              href={`/policies/${document.confirmedPolicyId}`}
              className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4"
            >
              {t('viewPolicy')}
            </Link>
          </p>
        ) : (
          <>
            <Button
              className="self-start"
              loading={confirm.isPending}
              onClick={() => confirm.mutate(document.id)}
            >
              {confirm.isPending ? t('confirming') : t('confirm')}
            </Button>
            {confirm.isError && (
              <p role="alert" className="flex items-start gap-2 text-body-md text-gap">
                <Icon name="error" className="mt-0.5 text-lg" />
                {t('error')}
              </p>
            )}
          </>
        ))}
    </Card>
  );
}

/** Reading progress from `document.progress`, as agent steps. */
function ReadingSteps({ document }: { document: DocumentRecord }) {
  const t = useTranslations('documents');
  const progress = document.progress;
  const current = progress ? STEPS.indexOf(progress.step as (typeof STEPS)[number]) : -1;
  const steps = STEPS.map((step, index) => ({
    label:
      step !== 'reading_pages'
        ? t(`steps.${step}`)
        : progress?.step === step && progress.done > 0
          ? t('steps.reading_pages', { done: progress.done, total: progress.total })
          : t('steps.reading'),
    state:
      index < current
        ? ('done' as const)
        : index === current
          ? ('active' as const)
          : ('pending' as const),
  }));
  return <AgentSteps steps={steps} className="text-body-sm" />;
}
