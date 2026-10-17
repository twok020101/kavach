'use client';

import type { Citation } from '@kavach/schemas';
import { ExternalLink, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CitationChip } from '../kavach/citation-chip';
import { Button } from '../ui/button';
import { openDocumentFile, useClause } from './api';

/** S07/S15: a citation chip on a fact that opens the clause it came from (S16). */
export function ClauseChip({ citation, householdId }: { citation: Citation; householdId: string }) {
  const t = useTranslations('documents');
  const [open, setOpen] = useState(false);
  const label = [
    citation.clauseRef && `§${citation.clauseRef}`,
    citation.page && `p${citation.page}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <>
      <CitationChip label={label || t('clause.fromDocument')} onClick={() => setOpen(true)} />
      {open && (
        <ClauseSheet citation={citation} householdId={householdId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

/** S16 clause viewer: the quote, its clause and page, and a way into the document. */
export function ClauseSheet({
  citation,
  householdId,
  onClose,
}: {
  citation: Citation;
  householdId: string;
  onClose: () => void;
}) {
  const t = useTranslations('documents');
  const { data: clause } = useClause(citation.clauseId);
  const page = citation.page ?? clause?.page;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label={t('clause.close')}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="clause-title"
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-lg bg-surface p-5 shadow-2 sm:rounded-lg"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="clause-title" className="font-display text-lg font-semibold">
              {clause
                ? t('clause.title', { ref: clause.ref, title: clause.title })
                : citation.clauseRef
                  ? `§${citation.clauseRef}`
                  : t('clause.fromDocument')}
            </h2>
            {page && <p className="text-sm text-muted">{t('clause.page', { page })}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label={t('clause.close')}
            className="rounded-sm p-1 text-muted hover:bg-sunken"
          >
            <X className="size-5" />
          </button>
        </header>

        <blockquote className="border-l-4 border-citation pl-3 font-serif text-lg leading-relaxed">
          “{citation.quote}”
        </blockquote>

        {clause && clause.text !== citation.quote && (
          <details className="rounded-md bg-sunken p-3 text-sm">
            <summary className="cursor-pointer font-medium">{t('clause.fullClause')}</summary>
            <p className="mt-2 font-serif leading-relaxed">{clause.text}</p>
          </details>
        )}

        {clause && (
          <p className="text-sm text-muted">
            {clause.insurer} · {clause.productName}
          </p>
        )}

        <Button
          variant="secondary"
          onClick={() => openDocumentFile(householdId, citation.documentId, page)}
        >
          <ExternalLink aria-hidden className="size-4" />
          {t('clause.open')}
        </Button>
      </section>
    </div>
  );
}
