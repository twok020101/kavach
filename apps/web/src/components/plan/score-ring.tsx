'use client';

import { useCountOnce } from '@/components/app/use-count-once';
import { cn } from '@/components/ui/cn';

const R = 15.9155; // circumference 100: the dash array reads in percent

/**
 * R-SC-001 safety score as a ring, 0–100 (Stitch gauge): a pale track, an arc in the score's
 * tone (green when well covered, marigold getting there, red when it needs attention), the
 * number in the middle. The number counts up the first time only; later changes move the arc.
 */
export function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const tone = score >= 70 ? 'text-safe' : score >= 40 ? 'text-accent' : 'text-gap';
  const shown = useCountOnce(score);
  return (
    <div
      role="img"
      aria-label={`${score} / 100`}
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeWidth="3.5"
          className="stroke-surface-container-high"
        />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          stroke="currentColor"
          className={cn(
            tone,
            'transition-[stroke-dasharray] duration-700 ease-[var(--ease-out-strong)]',
          )}
          strokeDasharray={`${Math.max(0, Math.min(100, shown))} 100`}
        />
      </svg>
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display font-bold leading-none tracking-tight text-on-surface tabular-nums"
          style={{ fontSize: Math.round(size * 0.36) }}
        >
          {shown}
        </span>
        {size >= 72 && (
          <span className="mt-0.5 font-serif text-[10px] leading-none text-on-surface-variant">
            / 100
          </span>
        )}
      </span>
    </div>
  );
}
