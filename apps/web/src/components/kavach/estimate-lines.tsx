'use client';

import type { BranchResult, HospitalEstimate, LineHead } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { Badge, type BadgeTone } from '../ui/badge';
import { cn } from '../ui/cn';
import { Amount } from './amount';

/** Heads the proportionate deduction never touches; mirrors the engine's list (R-HL-001, R-HL-002). */
const NEVER_RATIO: readonly LineHead[] = [
  'implant',
  'pharmacy',
  'consumables',
  'diagnostics',
  'icu',
  'non_payable',
];

type Mark = { tone: BadgeTone; key: 'nonPayable' | 'aboveLimit' | 'ratio' | 'icu' };

/**
 * The estimate's own lines for the room it was quoted for, each marked with what the policy
 * does to it once the engine has run: not payable, above the room limit, reduced with the
 * room, or never reduced (ICU). The figures are the hospital's; the marks and the totals
 * block under them are the engine's (Stitch 10/11 line-item table).
 */
export function EstimateLines({
  estimate,
  result,
}: {
  estimate: HospitalEstimate;
  /** The engine's primary branch, once evaluated; without it the lines carry no marks. */
  result?: BranchResult;
}) {
  const t = useTranslations('desk.session.estimate');
  const tc = useTranslations('common.compare');
  const quoted = estimate.roomCategories[0]!;
  const option = result?.options.find((o) => o.roomCategoryId === quoted.id);
  const fired = (ruleId: string) => option?.deductions.some((d) => d.ruleId === ruleId) ?? false;
  const ratio = fired('R-HL-001');
  const roomCut = fired('R-HL-008');

  const mark = (line: HospitalEstimate['lines'][number]): Mark | undefined => {
    if (!option) return undefined;
    if (line.head === 'non_payable') return { tone: 'gap', key: 'nonPayable' };
    if (line.head === 'room' && roomCut) return { tone: 'partial', key: 'aboveLimit' };
    if (line.head === 'icu' && ratio) return { tone: 'safe', key: 'icu' };
    if (ratio && line.pricedByRoom && !NEVER_RATIO.includes(line.head)) {
      return { tone: 'partial', key: 'ratio' };
    }
    return undefined;
  };

  const lines = estimate.lines.filter((l) => l.amounts[quoted.id] !== undefined);
  const total =
    estimate.printedTotals?.[quoted.id] ??
    lines.reduce((sum, l) => sum + (l.amounts[quoted.id] ?? 0), 0);

  const row = 'flex items-baseline justify-between gap-3';

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t('quotedFor', { room: quoted.label })}</p>
      <ul className="hairline text-base">
        {lines.map((line) => {
          const m = mark(line);
          return (
            <li
              key={line.head + line.label}
              className="flex items-start justify-between gap-3 py-3"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className={cn(m?.tone === 'gap' && 'text-muted line-through')}>
                  {line.label}
                </span>
                {m && (
                  <Badge tone={m.tone} className="self-start text-xs">
                    {t(`mark.${m.key}`)}
                  </Badge>
                )}
              </span>
              <Amount value={line.amounts[quoted.id] ?? 0} className="shrink-0 font-semibold" />
            </li>
          );
        })}
      </ul>
      {/* The totals row: the hospital's total, then what the engine makes of it. */}
      <dl className="flex flex-col gap-1.5 rounded-sm bg-sunken px-3 py-3">
        <div className={row}>
          <dt className="font-display font-bold">{t('total')}</dt>
          <dd>
            <Amount value={total} className="font-display text-xl font-bold" />
          </dd>
        </div>
        {option?.deductions.map((d) => (
          <div key={d.ruleId + d.label} className={row}>
            <dt className="text-sm text-muted">{tc('notPaid', { label: d.label })}</dt>
            <dd>
              <Amount value={d.amount} className="text-sm text-partial" />
            </dd>
          </div>
        ))}
        {option && (
          <>
            <div className={row}>
              <dt className="text-sm text-muted">{tc('policyPays')}</dt>
              <dd>
                <Amount value={option.policyPays} className="text-sm font-semibold" />
              </dd>
            </div>
            <div className={cn(row, 'mt-1 border-t border-border pt-2')}>
              <dt className="font-display font-bold">{tc('youPay')}</dt>
              <dd>
                <Amount value={option.outOfPocket} className="font-display text-xl font-bold" />
              </dd>
            </div>
          </>
        )}
      </dl>
    </div>
  );
}
