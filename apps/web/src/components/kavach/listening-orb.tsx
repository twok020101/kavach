'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/cn';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const SIZES = { sm: 'size-10', md: 'size-16', lg: 'size-28' } as const;

/**
 * The desk orb: indigo while listening or thinking, marigold while speaking, breathing
 * 1 → 1.06 at 1.6 s (07 §3.4, §7). Nothing else moves: no rings, gradient or shadow.
 * `lg` stacks the label under a big orb for the centre of the live screen.
 */
export function ListeningOrb({
  state,
  label,
  size = 'md',
}: {
  state: OrbState;
  /** Visible status next to the orb, e.g. "Kavach is listening". */
  label: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const reduce = useReducedMotion();
  const speaking = state === 'speaking';
  const active = state !== 'idle';
  const pulse =
    reduce || !active
      ? { scale: 1 }
      : speaking
        ? { scale: [1, 1.12, 0.98, 1.08, 1] }
        : { scale: [1, 1.06, 1] };
  const colour = speaking ? 'bg-accent' : active ? 'bg-primary' : 'bg-primary-soft';

  return (
    <div
      role="status"
      className={cn('flex items-center gap-3', size === 'lg' && 'flex-col gap-4 text-center')}
    >
      <span className={cn('relative inline-flex shrink-0', SIZES[size])}>
        <motion.span
          aria-hidden
          animate={pulse}
          transition={{ duration: speaking ? 1.2 : 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className={cn('absolute inset-0 rounded-full', colour)}
        />
      </span>
      <span className={cn('font-semibold', size === 'lg' && 'text-xl')}>{label}</span>
    </div>
  );
}
