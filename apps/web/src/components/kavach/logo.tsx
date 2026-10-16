import { cn } from '../ui/cn';

/** Kavach mark: two overlapping shield arcs (indigo and marigold), two people side by side. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-8', className)}>
      <path
        d="M15 4 5 7.5V15c0 6.6 4.2 11 10 13"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 4l10 3.5V15c0 6.6-4.2 11-10 13"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="2.2" fill="var(--primary)" />
      <circle cx="20" cy="13" r="2.2" fill="var(--accent)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-primary', className)}>
      <LogoMark />
      <span className="font-display text-2xl font-bold tracking-tight">Kavach</span>
    </span>
  );
}
