import { cn } from './cn';

/** A grey block that stands in for content while it loads; a soft light passes over it. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('shimmer rounded-md', className)} />;
}
