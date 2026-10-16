'use client';

import type { BranchResult } from '@kavach/schemas';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import { cn } from '../ui/cn';
import { Amount } from './amount';

/**
 * Side-by-side engine result per room: bill, what insurance won't pay, co-pay, and what you pay.
 * Each line's label sits on its own row above the values, so it fits a phone at desk size.
 */
export function RoomCompare({ result }: { result: BranchResult }) {
  const t = useTranslations('common.compare');
  const { options } = result;
  const deductionLabels = [...new Set(options.flatMap((o) => o.deductions.map((d) => d.label)))];
  const best = (id: string) => id === result.recommendedRoomCategoryId;

  const rows: { label: string; values: (number | undefined)[]; strong?: boolean }[] = [
    { label: t('bill'), values: options.map((o) => o.bill) },
    ...deductionLabels.map((label) => ({
      label: t('notPaid', { label }),
      values: options.map((o) => o.deductions.find((d) => d.label === label)?.amount),
    })),
    { label: t('copay'), values: options.map((o) => o.copay) },
    { label: t('policyPays'), values: options.map((o) => o.policyPays) },
    { label: t('youPay'), values: options.map((o) => o.outOfPocket), strong: true },
  ];

  return (
    <table className="w-full table-fixed text-left">
      <thead>
        <tr>
          {options.map((o) => (
            <th
              key={o.roomCategoryId}
              scope="col"
              className={cn(
                'rounded-t-sm p-2 align-bottom',
                best(o.roomCategoryId) && 'bg-safe-bg',
              )}
            >
              <Amount value={o.rentPerDay} className="font-display text-lg font-bold" />
              <span className="block text-sm font-normal text-muted">{o.label}</span>
              {best(o.roomCategoryId) && (
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-safe">
                  <Star aria-hidden className="size-4" />
                  {t('recommended')}
                </span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fragment key={row.label}>
            <tr className="border-t border-border">
              <th
                scope="colgroup"
                colSpan={options.length}
                className={cn(
                  'px-2 pt-2 text-sm',
                  row.strong ? 'font-bold' : 'font-medium text-muted',
                )}
              >
                {row.label}
              </th>
            </tr>
            <tr>
              {row.values.map((v, i) => (
                <td
                  key={options[i]!.roomCategoryId}
                  className={cn(
                    'px-2 pb-2',
                    row.strong && 'font-display text-2xl font-bold',
                    best(options[i]!.roomCategoryId) && 'bg-safe-bg',
                  )}
                >
                  {v === undefined ? <span aria-label={t('none')}>–</span> : <Amount value={v} />}
                </td>
              ))}
            </tr>
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
