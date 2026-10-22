import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'primary' | 'safe' | 'partial' | 'gap' | 'na';

/** Pill fills with a hairline of their own colour (DESIGN.md §Status Badges). */
const tones: Record<BadgeTone, string> = {
  neutral: 'border-border bg-sunken text-text',
  primary: 'border-primary/15 bg-primary-soft text-primary-hover',
  safe: 'border-safe/20 bg-safe-bg text-safe',
  partial: 'border-partial/20 bg-partial-bg text-partial',
  gap: 'border-gap/20 bg-gap-bg text-gap',
  na: 'border-na/15 bg-na-bg text-na',
};

/** A small label. Always carries a word; the icon is optional. */
export function Badge({
  tone = 'neutral',
  icon: Icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-medium',
        tones[tone],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-4 shrink-0" strokeWidth={2} />}
      {/* A single long word (Tamil, Malay) breaks inside the pill instead of running out of it. */}
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </span>
  );
}
