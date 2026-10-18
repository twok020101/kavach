'use client';

import { RULES } from '@kavach/engine';
import { CitationChip } from '@/components/kavach/citation-chip';
import { RuleId, VerifiedBadge } from '@/components/kavach/verified-badge';

/** The engine rules behind a number or a step, with status and sources (the Why panel content). */
export function RuleList({ ids }: { ids: string[] }) {
  const rules = [...new Set(ids)].flatMap((id) => (RULES[id] ? [RULES[id]] : []));
  return (
    <ol className="flex flex-col gap-2">
      {rules.map((r) => (
        <li key={r.id} className="rounded-md bg-sunken p-3">
          <div className="flex flex-wrap items-center gap-2">
            <RuleId id={r.id} />
            <VerifiedBadge verified={r.status === 'verified'} />
          </div>
          <p className="mt-2 text-sm">{r.statement}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.sources.map((s) => (
              <CitationChip
                key={s.title}
                label={s.title.replace(/\s*\(docs\/[^)]*\)/, '')}
                href={s.url}
              />
            ))}
          </div>
        </li>
      ))}
    </ol>
  );
}
