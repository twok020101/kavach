'use client';

import type { DeskEvaluation, HospitalEstimate, RuleFiring } from '@kavach/schemas';
import { useLocale, useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { cn } from '@/components/ui/cn';
import { quotedOption } from './labels';

type Outcome = {
  tone: 'gap' | 'partial' | 'safe' | 'na';
  word?: string;
  amount?: number;
  minus?: boolean;
};

const toneClass: Record<Outcome['tone'], string> = {
  gap: 'border-gap/25 bg-gap-bg text-gap',
  partial: 'border-partial/25 bg-partial-bg text-partial',
  safe: 'border-safe/25 bg-safe-bg text-safe',
  na: 'border-border bg-surface text-muted',
};

/**
 * "Policy rules applied" (Stitch desk co-pilot): every rule the engine fired, once each, as it
 * applies to the room the hospital quoted: the rule id in mono, its name in the session's
 * language, the outcome (what it cut, the co-pay, what the top-up pays) and whether the rule is
 * verified or still to be verified with the insurer.
 */
export function RulesCard({
  evaluation,
  estimate,
}: {
  evaluation: DeskEvaluation;
  estimate?: HospitalEstimate;
}) {
  const t = useTranslations('desk.session.rules');
  const locale = useLocale();
  const { quoted, option } = quotedOption(estimate, evaluation.primary);
  // Singapore: the first policy in the claim order is the Integrated Shield Plan when there is one.
  const lead = evaluation.policyOrder[0];

  // One row per rule, from the quoted room's firing when the rule fired per room; where a rule
  // fired once for MediShield Life and once for the plan (R-SG-003, R-SG-004), the plan's.
  const rules = [...new Set(evaluation.trace.map((f) => f.ruleId))].map((ruleId) => {
    const all = evaluation.trace.filter((f) => f.ruleId === ruleId);
    const forRoom = all.filter((f) => f.inputs.roomCategoryId === quoted?.id);
    return forRoom.find((f) => f.inputs.policyId === lead) ?? forRoom[0] ?? all[0]!;
  });
  const percent = (n: number) => new Intl.NumberFormat(locale, { style: 'percent' }).format(n);
  const riderFiring = rules.find((f) => f.ruleId === 'R-SG-006');

  const outcome = (f: RuleFiring): Outcome => {
    const cut = option?.deductions
      .filter((d) => d.ruleId === f.ruleId)
      .reduce((sum, d) => sum + d.amount, 0);
    if (cut) return { tone: 'gap', amount: cut, minus: true };
    const out = f.output as Record<string, unknown>;
    const input = f.inputs as Record<string, unknown>;
    // Singapore: what each rule did to the quoted ward, in the engine's own figures.
    if (f.ruleId === 'R-SG-001' && typeof input.factor === 'number' && input.factor < 1)
      return { tone: 'partial', word: t('outcome.counts', { percent: percent(input.factor) }) };
    if (f.ruleId === 'R-SG-003' && typeof input.deductible === 'number') {
      const riderOut = riderFiring?.output as Record<string, unknown> | undefined;
      return riderOut?.familyDeductible === 0
        ? { tone: 'safe', word: t('outcome.riderCovers'), amount: input.deductible }
        : { tone: 'partial', word: t('outcome.deductible'), amount: input.deductible };
    }
    if (f.ruleId === 'R-SG-004' && typeof out.coinsurance === 'number')
      return { tone: 'na', word: t('outcome.coinsurance'), amount: out.coinsurance };
    if (f.ruleId === 'R-SG-005' && out.notClaimable === 0)
      return { tone: 'safe', word: t('outcome.asCharged') };
    if (f.ruleId === 'R-SG-010') return { tone: 'partial', word: t('outcome.ask') };
    if (f.ruleId === 'R-HL-003' && typeof out.copay === 'number')
      return { tone: 'partial', word: t('outcome.copay'), amount: out.copay };
    if (f.ruleId === 'R-HL-009' && typeof out.pays === 'number')
      return { tone: 'na', word: t('outcome.pays'), amount: out.pays };
    if (f.ruleId === 'R-HL-002') return { tone: 'safe', word: t('outcome.protected') };
    if (f.ruleId === 'R-HL-010' || f.ruleId === 'R-HL-014')
      return { tone: 'partial', word: t('outcome.ask') };
    return { tone: 'na', word: t('outcome.applied') };
  };

  return (
    <section
      aria-labelledby="rules-title"
      className="rise-in flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-1"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="rules-title" className="flex items-center gap-1.5 text-sm font-bold text-text">
          <Icon name="rule" className="text-lg text-primary-container" />
          {t('title')}
        </h3>
        <span className="font-mono text-[11px] text-muted">
          {t('count', { count: rules.length })}
        </span>
      </div>
      <ul className="stagger flex flex-col divide-y divide-border rounded-lg border border-border bg-sunken">
        {rules.map((f, i) => {
          const o = outcome(f);
          const key = `names.${f.ruleId}`;
          const verified = f.status === 'verified';
          // A long name (Malay, Tamil) keeps its width; the outcome chip drops under it.
          return (
            <li
              key={f.ruleId}
              style={{ '--i': i } as CSSProperties}
              className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1 basis-52">
                <p className="text-sm leading-snug text-text">
                  <span className="mr-1.5 font-mono text-xs font-semibold text-primary-hover">
                    {f.ruleId}
                  </span>
                  {t.has(key) ? t(key) : f.statement}
                </p>
                <p
                  className={cn(
                    'mt-0.5 inline-flex items-center gap-1 text-xs',
                    verified ? 'text-safe' : 'text-partial',
                  )}
                >
                  <Icon
                    name={verified ? 'verified' : 'pending'}
                    fill={verified}
                    className="text-sm"
                  />
                  {verified ? t('verified') : t('toVerify')}
                </p>
              </div>
              <span
                className={cn(
                  'inline-flex max-w-full shrink-0 items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-semibold',
                  toneClass[o.tone],
                )}
              >
                {o.word}
                {o.amount !== undefined && (
                  <span className="whitespace-nowrap">
                    {o.minus && '−'}
                    <Amount value={o.amount} />
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
