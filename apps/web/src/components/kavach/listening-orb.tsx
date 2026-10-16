'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/cn';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

/** The desk orb: indigo while listening or thinking, marigold while speaking. */
export function ListeningOrb({
  state,
  label,
  size = 'md',
}: {
  state: OrbState;
  /** Visible status next to the orb, e.g. "Kavach is listening". */
  label: string;
  size?: 'sm' | 'md';
}) {
  const reduce = useReducedMotion();
  const speaking = state === 'speaking';
  const pulse =
    reduce || state === 'idle'
      ? { scale: 1 }
      : speaking
        ? { scale: [1, 1.12, 0.98, 1.08, 1] }
        : { scale: [1, 1.06, 1] };

  return (
    <div role="status" className="flex items-center gap-3">
      <span className={cn('relative inline-flex shrink-0', size === 'md' ? 'size-16' : 'size-10')}>
        <motion.span
          aria-hidden
          animate={pulse}
          transition={{ duration: speaking ? 1.2 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'absolute inset-0 rounded-full',
            speaking ? 'bg-accent' : state === 'idle' ? 'bg-primary-soft' : 'bg-primary',
          )}
        />
        {state === 'thinking' && (
          <span
            aria-hidden
            className="absolute -inset-1.5 animate-spin rounded-full border-4 border-primary-soft border-t-primary"
          />
        )}
      </span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}
