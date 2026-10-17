'use client';

import { useCountUp } from '@/lib/use-count-up';

/** R-SC-001 safety score as a ring, 0–100. The number counts up when it first appears. */
export function ScoreRing({ score, size = 96 }: { score: number; size?: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const tone = score >= 70 ? 'text-safe' : score >= 40 ? 'text-partial' : 'text-gap';
  const shown = useCountUp(score);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${score} / 100`}
      className="shrink-0"
    >
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-sunken" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        stroke="currentColor"
        className={`${tone} transition-[stroke-dasharray] duration-700 ease-out`}
        strokeDasharray={`${(shown / 100) * circumference} ${circumference}`}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="50"
        dy="0.12em"
        dominantBaseline="middle"
        textAnchor="middle"
        className="fill-current font-display text-[32px] font-bold tabular-nums"
      >
        {shown}
      </text>
      <text
        x="50"
        y="72"
        textAnchor="middle"
        className="fill-current font-sans text-[10px] font-semibold uppercase tracking-wide text-muted"
      >
        / 100
      </text>
    </svg>
  );
}
