'use client';

import { useMoney } from '@/lib/country';
import { cn } from '../ui/cn';

/** An amount in the household's currency (₹1,50,800 with Indian grouping, or S$) with tabular figures. */
export function Amount({ value, className }: { value: number; className?: string }) {
  const money = useMoney();
  return (
    <span className={cn('amount whitespace-nowrap tabular-nums', className)}>{money(value)}</span>
  );
}
