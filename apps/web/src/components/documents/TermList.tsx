'use client';

import { useTranslations } from 'next-intl';
import { CitationChip } from './ClauseSheet';
import type { Term } from './terms';

/** Label, value and citation chip for each term; terms without a source say so. */
export function TermList({ terms, householdId }: { terms: Term[]; householdId: string }) {
  const t = useTranslations('documents');
  return (
    <dl className="flex flex-col divide-y divide-border">
      {terms.map((term) => (
        <div key={term.key} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
          <dt className="w-36 shrink-0 text-sm text-muted">{term.label}</dt>
          <dd className="amount flex flex-1 flex-wrap items-baseline justify-between gap-2 font-medium">
            <span>{term.value}</span>
            {term.citation ? (
              <CitationChip citation={term.citation} householdId={householdId} />
            ) : (
              <span className="text-xs font-normal text-muted">{t('notCited')}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
