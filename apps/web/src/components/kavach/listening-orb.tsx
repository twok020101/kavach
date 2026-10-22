'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/cn';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const SIZES = { sm: 'size-10', md: 'size-16', lg: 'size-36' } as const;

/**
 * The desk orb: a soft sphere with the Kavach shield at its heart. Indigo while listening or
 * thinking, marigold while speaking (07 §3.4). Listening sends out slow sonar rings; thinking
 * turns a thin arc around the sphere; speaking shows a small voice wave under it. Everything is
 * slow and quiet, and reduced motion leaves only the colour and the label.
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
  const listening = state === 'listening';
  const thinking = state === 'thinking';
  const active = state !== 'idle';
  const big = size === 'lg';
  const pulse =
    reduce || !active
      ? { scale: 1 }
      : speaking
        ? { scale: [1, 1.08, 0.99, 1.06, 1] }
        : { scale: [1, 1.05, 1] };

  return (
    <div
      role="status"
      className={cn('flex items-center gap-3', big && 'flex-col gap-14 text-center')}
    >
      <span
        className={cn(
          'orb relative inline-flex shrink-0 items-center justify-center',
          SIZES[size],
          speaking ? 'orb--speaking' : active ? 'orb--active' : 'orb--idle',
          // The console orb (Stitch desk co-pilot): an indigo sphere in a pale rim.
          big && 'orb--lg',
        )}
      >
        {/* Sonar rings while listening. Rings, arc and wave are always rendered (the server
            can't know the motion setting) and hidden by CSS under reduced motion. */}
        {listening && (
          <>
            <span aria-hidden className="orb__ring" />
            <span aria-hidden className="orb__ring orb__ring--2" />
            <span aria-hidden className="orb__ring orb__ring--3" />
          </>
        )}
        {/* A thin arc turning while Kavach checks the numbers */}
        {thinking && <span aria-hidden className="orb__arc" />}
        <motion.span
          aria-hidden
          animate={pulse}
          transition={{ duration: speaking ? 1.1 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="orb__core absolute inset-0 rounded-full"
        />
        <svg
          viewBox="0 0 32 32"
          aria-hidden
          className={cn(
            'relative text-white',
            big ? 'size-14' : size === 'md' ? 'size-8' : 'size-5',
          )}
        >
          <path
            d="M15 4 5 7.5V15c0 6.6 4.2 11 10 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <path
            d="M17 4l10 3.5V15c0 6.6-4.2 11-10 13"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <circle cx="12" cy="13" r="2.2" fill="currentColor" />
          <circle cx="20" cy="13" r="2.2" fill="currentColor" />
        </svg>
      </span>
      <span className={cn('flex flex-col items-center gap-2', !big && 'items-start')}>
        <span className={cn('font-semibold', big && 'font-display text-xl font-bold')}>
          {label}
        </span>
        {speaking && (
          <span aria-hidden className="orb__wave">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </span>
    </div>
  );
}
