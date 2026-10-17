import { cn } from './cn';

/** A grey block that stands in for content while it loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-sunken', className)} />;
}
