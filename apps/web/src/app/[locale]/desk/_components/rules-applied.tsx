'use client';

import type { RuleFiring } from '@kavach/schemas';
import { BadgeCheck, CircleDashed, ScrollText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { RuleId } from '@/components/kavach/verified-badge';
import { Card } from '@/components/ui/card';

/**
 * "Policy rules applied" (Stitch desk): every rule the engine fired, by id, with its statement
 * and whether it is verified. `children` holds the full working (the Why panel).
 */
export function RulesApplied({ trace, children }: { trace: RuleFiring[]; children?: ReactNode }) {
  const t = useTranslations('desk.session.rules');
  const tc = useTranslations('common');
  const rules = trace.filter((f, i, all) => all.findIndex((g) => g.ruleId === f.ruleId) === i);
  if (rules.length === 0) return null;
  return (
    <Card as="section" aria-labelledby="rules-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rules-title" className="flex items-center gap-2 font-display text-lg font-bold">
          <ScrollText aria-hidden className="size-5 text-primary" />
          {t('title')}
        </h2>
        <span className="text-sm text-muted">{t('count', { count: rules.length })}</span>
      </div>
      <ol className="flex flex-col divide-y divide-border rounded-md border border-border bg-sunken px-3">
        {rules.map((f) => (
          <li key={f.ruleId} className="flex flex-wrap items-start gap-x-2 gap-y-1 py-2.5">
            <RuleId id={f.ruleId} />
            {/* Two lines each; the full statement and its working are in the Why panel below. */}
            <span
              title={f.statement}
              className="line-clamp-2 min-w-0 flex-1 basis-48 text-sm leading-snug"
            >
              {f.statement}
            </span>
            <span
              className={
                f.status === 'verified'
                  ? 'flex shrink-0 items-center gap-1 text-xs font-semibold text-safe'
                  : 'flex shrink-0 items-center gap-1 text-xs font-semibold text-partial'
              }
            >
              {f.status === 'verified' ? (
                <BadgeCheck aria-hidden className="size-4" />
              ) : (
                <CircleDashed aria-hidden className="size-4" />
              )}
              {f.status === 'verified' ? tc('verified') : tc('toVerify')}
            </span>
          </li>
        ))}
      </ol>
      {children}
    </Card>
  );
}
