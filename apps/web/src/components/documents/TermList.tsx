'use client';

import { useTranslations } from 'next-intl';
import { ClauseChip } from './ClauseSheet';
import type { Term } from './terms';

/** Label, value and citation chip for each term; terms without a source say so. */
export function TermList({ terms, householdId }: { terms: Term[]; householdId: string }) {
  const t = useTranslations('documents');
  return (
    <dl className="flex flex-col divide-y divide-border">
      {terms.map((term) => (
        <div key={term.key} className="grid grid-cols-[6.5rem_1fr_auto] items-start gap-x-3 py-2">
          <dt className="text-sm text-muted">{term.label}</dt>
          <dd className="amount font-medium">{term.value}</dd>
          <dd className="justify-self-end">
            {term.citation ? (
              <ClauseChip citation={term.citation} householdId={householdId} />
            ) : (
              <span className="text-xs text-muted">{t('notCited')}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
