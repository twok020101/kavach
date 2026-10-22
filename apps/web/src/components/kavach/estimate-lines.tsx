'use client';

import type { BranchResult, HospitalEstimate, LineHead } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { cn } from '../ui/cn';
import { Spinner } from '../ui/spinner';
import { Amount } from './amount';
import { Icon } from './icon';

/** Heads the proportionate deduction never touches; mirrors the engine's list (R-HL-001, R-HL-002). */
const NEVER_RATIO: readonly LineHead[] = [
  'implant',
  'pharmacy',
  'consumables',
  'diagnostics',
  'icu',
  'non_payable',
];

type FlagKey = 'nonPayable' | 'aboveLimit' | 'ratio' | 'never' | 'icu';
type Flag = { key: FlagKey; ruleId: string; amount?: number };

const flagStyle: Record<FlagKey, { chip: string; row: string; note: string; icon: string }> = {
  nonPayable: {
    chip: 'border-gap/25 bg-gap-bg text-gap',
    row: 'bg-gap-bg/35',
    note: 'text-gap',
    icon: 'block',
  },
  aboveLimit: {
    chip: 'border-gap/25 bg-gap-bg text-gap',
    row: 'bg-gap-bg/35',
    note: 'text-gap',
    icon: 'trending_up',
  },
  ratio: {
    chip: 'border-partial/25 bg-partial-bg text-partial',
    row: 'bg-partial-bg/40',
    note: 'text-partial',
    icon: 'warning',
  },
  never: {
    chip: 'border-safe/25 bg-safe-bg text-safe',
    row: '',
    note: 'text-safe',
    icon: 'verified_user',
  },
  icu: {
    chip: 'border-safe/25 bg-safe-bg text-safe',
    row: '',
    note: 'text-safe',
    icon: 'verified_user',
  },
};

/**
 * The scanned bill (Stitch desk co-pilot): the estimate's own lines for the room it was quoted
 * for, each flagged with what the policy does to it once the engine has run (not payable, above
 * the room limit, cut in proportion, never cut), with the rule that decides it. The figures are
 * the hospital's; the flags, the over-limit amount and the totals under the table are the engine's.
 */
export function EstimateLines({
  estimate,
  result,
  checking = false,
}: {
  estimate: HospitalEstimate;
  /** The engine's primary branch, once evaluated; without it the lines carry no flags. */
  result?: BranchResult;
  /** True while the engine is still running, to say so under the lines. */
  checking?: boolean;
}) {
  const t = useTranslations('desk.session');
  const quoted = estimate.roomCategories[0]!;
  const option = result?.options.find((o) => o.roomCategoryId === quoted.id);
  const deduction = (ruleId: string) => option?.deductions.find((d) => d.ruleId === ruleId);
  const ratio = deduction('R-HL-001');
  const roomCut = deduction('R-HL-008');

  const flag = (line: HospitalEstimate['lines'][number]): Flag | undefined => {
    if (!option) return undefined;
    if (line.head === 'non_payable') return { key: 'nonPayable', ruleId: 'R-HL-005' };
    if (line.head === 'room' && roomCut)
      return { key: 'aboveLimit', ruleId: 'R-HL-008', amount: roomCut.amount };
    if (line.head === 'icu' && ratio) return { key: 'icu', ruleId: 'R-HL-002' };
    if (ratio && NEVER_RATIO.includes(line.head)) return { key: 'never', ruleId: 'R-HL-001' };
    if (ratio && line.pricedByRoom && line.head !== 'room')
      return { key: 'ratio', ruleId: 'R-HL-001' };
    return undefined;
  };

  const lines = estimate.lines.filter((l) => l.amounts[quoted.id] !== undefined);
  const total =
    estimate.printedTotals?.[quoted.id] ??
    lines.reduce((sum, l) => sum + (l.amounts[quoted.id] ?? 0), 0);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <ul className="stagger divide-y divide-border">
        {lines.map((line, i) => {
          const f = flag(line);
          const s = f ? flagStyle[f.key] : undefined;
          return (
            <li
              key={line.head + line.label}
              style={{ '--i': i } as CSSProperties}
              className={cn('flex items-start justify-between gap-3 px-3 py-3 sm:px-4', s?.row)}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span
                  className={cn(
                    'text-sm font-medium leading-snug text-text',
                    f?.key === 'nonPayable' && 'text-muted line-through decoration-gap/60',
                  )}
                >
                  {line.label}
                </span>
                {f && s && (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-semibold',
                        s.chip,
                      )}
                    >
                      <Icon name={s.icon} className="text-sm" />
                      {t(`bill.flag.${f.key}`)}
                    </span>
                    <span className="font-mono text-[11px] text-muted">{f.ruleId}</span>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                <Amount
                  value={line.amounts[quoted.id] ?? 0}
                  className="text-sm font-semibold text-text"
                />
                {f && s && (
                  <span className={cn('text-xs font-medium', s.note)}>
                    {t(`bill.note.${f.key}`)}
                    {f.amount !== undefined && (
                      <>
                        {': '}
                        <Amount value={f.amount} className="font-bold" />
                      </>
                    )}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {checking && !option && (
        <p className="flex items-center gap-2 border-t border-border px-4 py-2.5 text-sm text-muted">
          <Spinner className="size-4 text-primary" />
          {t('bill.checking')}
        </p>
      )}

      {/* The total as printed, then what the engine makes of it. */}
      <div className="flex items-baseline justify-between gap-3 border-t border-border bg-sunken px-3 py-3 sm:px-4">
        <span className="font-display text-sm font-bold text-text sm:text-base">
          {t('bill.total', { room: quoted.label })}
        </span>
        <Amount value={total} className="font-display text-lg font-bold text-text" />
      </div>
      {option && (
        <dl className="flex flex-col gap-1.5 border-t border-border px-3 py-3 text-sm sm:px-4">
          {option.deductions.map((d) => (
            <div key={d.ruleId + d.label} className="flex items-baseline justify-between gap-3">
              <dt className="min-w-0 text-muted">
                {t('bill.notPaid')} · <DeductionName ruleId={d.ruleId} label={d.label} />
                <span className="ml-1.5 font-mono text-[11px]">{d.ruleId}</span>
              </dt>
              <dd className="shrink-0 font-semibold text-gap">
                −<Amount value={d.amount} />
              </dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted">{t('bill.policyPays')}</dt>
            <dd>
              <Amount value={option.policyPays} className="font-semibold text-text" />
            </dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
            <dt className="font-display font-bold text-text">{t('bill.youPay')}</dt>
            <dd>
              <Amount value={option.outOfPocket} className="font-display text-lg font-bold" />
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

/** A deduction in the session's language, by rule id (the engine's English label otherwise). */
function DeductionName({ ruleId, label }: { ruleId: string; label: string }) {
  const t = useTranslations('desk.session.deduction');
  const key = ruleId === 'R-MT-001' && /^no /i.test(label) ? 'R-MT-001-none' : ruleId;
  return <>{t.has(key) ? t(key) : label}</>;
}
