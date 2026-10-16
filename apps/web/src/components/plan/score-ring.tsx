/** R-SC-001 safety score as a ring, 0–100. */
export function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = 30;
  const circumference = 2 * Math.PI * r;
  const tone = score >= 70 ? 'text-safe' : score >= 40 ? 'text-partial' : 'text-gap';
  return (
    <svg viewBox="0 0 72 72" width={size} height={size} role="img" aria-label={`${score} / 100`}>
      <circle cx="36" cy="36" r={r} fill="none" strokeWidth="8" className="stroke-sunken" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        stroke="currentColor"
        className={`${tone} transition-all duration-500`}
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="42" textAnchor="middle" className="fill-current font-display text-lg font-bold">
        {score}
      </text>
    </svg>
  );
}
