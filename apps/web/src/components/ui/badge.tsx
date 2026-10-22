import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'primary' | 'safe' | 'partial' | 'gap' | 'na';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-text',
  primary: 'bg-primary-soft text-primary-hover',
  safe: 'bg-safe-bg text-safe',
  partial: 'bg-partial-bg text-partial',
  gap: 'bg-gap-bg text-gap',
  na: 'bg-na-bg text-na',
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
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm font-medium',
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
