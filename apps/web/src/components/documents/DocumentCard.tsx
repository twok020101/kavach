'use client';

import type { DocumentRecord, Household } from '@kavach/schemas';
import clsx from 'clsx';
import { Check, Circle, FileText, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useConfirmDocument } from './api';
import { CitationChip } from './ClauseSheet';
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
  const confirm = useConfirmDocument(household.id);
  const extraction = document.extraction;
  const policy = extraction?.policy;

  return (
    <article className="relative flex flex-col gap-3 rounded-md border border-border bg-surface p-4">
      <header className="flex items-start gap-3">
        <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{document.filename}</h3>
          {document.status === 'read' && (
            <p className="text-sm text-muted">{t(`kinds.${document.kind}`)}</p>
          )}
        </div>
        {document.isSample && (
          <span className="rounded-sm bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent-ink">
            {t('sample')}
          </span>
        )}
      </header>

      {(document.status === 'uploaded' || document.status === 'reading') && (
        <ReadingSteps document={document} />
      )}

      {document.status === 'failed' && (
        <p className="rounded-sm bg-gap-bg p-2 text-sm text-gap">
          {t('failed', { error: document.error ?? '' })}
        </p>
      )}

      {extraction && policy && (
        <div className="flex flex-col gap-2">
          <div>
            <p className="font-medium">{policy.productName}</p>
            <p className="text-sm text-muted">{policy.insurer}</p>
            <p className="text-sm text-muted">
              {t('covers', {
                names: memberNames(
                  household,
                  extraction.insuredPersons.map((p) => p.memberId ?? p.name),
                ),
              })}
            </p>
          </div>
          <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">{t('check')}</h4>
          <TermList terms={keyTerms(policy, t)} householdId={household.id} />
        </div>
      )}

      {extraction && !policy && (
        <div className="flex flex-col gap-2">
          {extraction.summary && <p className="text-sm">{extraction.summary}</p>}
          {extraction.citations.map((citation) => (
            <p key={citation.quote} className="flex items-start gap-2 text-sm text-muted">
              <span className="flex-1 font-serif">“{citation.quote}”</span>
              <CitationChip citation={citation} householdId={household.id} />
            </p>
          ))}
        </div>
      )}

      {policy &&
        (document.confirmedPolicyId ? (
          <p className="flex items-center justify-between gap-2 rounded-sm bg-safe-bg p-2 text-sm text-safe">
            <span className="flex items-center gap-1">
              <Check aria-hidden className="size-4" />
              {t('confirmed')}
            </span>
            <Link
              href={`/policies/${document.confirmedPolicyId}`}
              className="font-semibold underline"
            >
              {t('viewPolicy')}
            </Link>
          </p>
        ) : (
          <button
            disabled={confirm.isPending}
            onClick={() => confirm.mutate(document.id)}
            className="rounded-md bg-primary px-4 py-3 font-semibold text-on-primary hover:bg-primary-hover disabled:opacity-60"
          >
            {confirm.isPending ? t('confirming') : t('confirm')}
          </button>
        ))}
    </article>
  );
}

/** AgentSteps-style list driven by `document.progress`. */
function ReadingSteps({ document }: { document: DocumentRecord }) {
  const t = useTranslations('documents');
  const progress = document.progress;
  const current = progress ? STEPS.indexOf(progress.step as (typeof STEPS)[number]) : -1;

  return (
    <ol className="flex flex-col gap-1.5 text-sm" aria-live="polite">
      {STEPS.map((step, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'pending';
        const label =
          step === 'reading_pages' && progress?.step === step && progress.done > 0
            ? t('steps.reading_pages', { done: progress.done, total: progress.total })
            : step === 'reading_pages'
              ? t('steps.reading')
              : t(`steps.${step}`);
        return (
          <li
            key={step}
            className={clsx(
              'flex items-center gap-2',
              state === 'pending' && 'text-muted',
              state === 'done' && 'text-safe',
            )}
          >
            {state === 'done' && <Check aria-hidden className="size-4" />}
            {state === 'active' && (
              <LoaderCircle aria-hidden className="size-4 animate-spin text-primary" />
            )}
            {state === 'pending' && <Circle aria-hidden className="size-4" />}
            {label}
          </li>
        );
      })}
    </ol>
  );
}
