import { formatInr } from '@kavach/engine';
import { cn } from '../ui/cn';

/** A rupee amount with Indian digit grouping (₹1,50,800) and tabular figures. */
export function Amount({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('amount whitespace-nowrap tabular-nums', className)}>
      {formatInr(value)}
    </span>
  );
}
