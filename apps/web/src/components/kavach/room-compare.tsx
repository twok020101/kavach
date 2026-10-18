'use client';

import type { BranchResult } from '@kavach/schemas';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { cn } from '../ui/cn';
import { Amount } from './amount';

/**
 * Side-by-side engine result per room, one card each (Stitch desk): the recommended room in a
 * green frame with "Kavach recommends", a room that costs the family more in a red frame with a
 * warning chip. Each card lists the bill, what the insurer will not pay, the co-pay, what the
 * policy pays and what the family pays. Every figure is the engine's.
 */
export function RoomCompare({ result }: { result: BranchResult }) {
  const t = useTranslations('common.compare');
  const td = useTranslations('desk.session.result');
  const { options } = result;
  const rec = options.find((o) => o.roomCategoryId === result.recommendedRoomCategoryId);

  return (
    <ul className={cn('grid grid-cols-1 gap-3', options.length > 1 && 'sm:grid-cols-2')}>
      {options.map((o) => {
        const best = o.roomCategoryId === result.recommendedRoomCategoryId;
        const worse = !best && rec !== undefined && o.outOfPocket > rec.outOfPocket;
        const rows: { label: string; value: number; tone?: 'gap' }[] = [
          { label: t('bill'), value: o.bill },
          ...o.deductions.map((d) => ({
            label: t('notPaid', { label: d.label }),
            value: d.amount,
            tone: 'gap' as const,
          })),
          { label: t('copay'), value: o.copay },
          { label: t('policyPays'), value: o.policyPays },
        ];
        return (
          <li
            key={o.roomCategoryId}
            className={cn(
              'flex flex-col gap-2 rounded-md border-2 p-3',
              best
                ? 'border-safe/50 bg-safe-bg/40'
                : worse
                  ? 'border-gap/40 bg-gap-bg/30'
                  : 'border-border bg-surface',
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 border-b border-border/70 pb-2">
              <span className="min-w-0">
                <span className="block font-display text-base font-bold leading-tight">
                  {o.label}
                </span>
                <span className="text-sm text-muted">
                  <Amount value={o.rentPerDay} /> {td('perDay')}
                </span>
              </span>
              {best ? (
                <Badge tone="safe" icon={CircleCheck} className="text-xs">
                  {td('recommendedChip')}
                </Badge>
              ) : worse ? (
                <Badge tone="gap" icon={TriangleAlert} className="text-xs">
                  {td('costsMoreChip')}
                </Badge>
              ) : null}
            </div>
            <dl className="flex flex-col gap-1 text-sm">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">{row.label}</dt>
                  <dd>
                    <Amount
                      value={row.value}
                      className={cn('font-semibold', row.tone === 'gap' && 'text-gap')}
                    />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="flex items-baseline justify-between gap-3 border-t border-border/70 pt-2">
              <span className="font-semibold">{t('youPay')}</span>
              <Amount
                value={o.outOfPocket}
                className={cn(
                  'font-display text-xl font-bold',
                  best ? 'text-safe' : worse ? 'text-gap' : 'text-text',
                )}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
