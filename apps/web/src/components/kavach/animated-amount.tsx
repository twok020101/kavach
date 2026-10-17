'use client';

import { formatInr } from '@kavach/engine';
import { useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../ui/cn';

const DURATION_MS = 900;

/**
 * A rupee amount that counts up from zero the first time it scrolls into view (07 §7).
 * Assistive tech reads the real value; the ticking digits are visual only.
 * Never use it for a number that changes because of a correction: use `Amount`.
 */
export function AnimatedAmount({
  value,
  className,
  delay = 0,
}: {
  value: number;
  className?: string;
  /** Milliseconds to wait before counting, to follow a card's own entrance. */
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!seen || reduce) return;
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / DURATION_MS));
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [seen, reduce, value, delay]);

  const current = reduce ? value : shown;
  return (
    <span ref={ref} className={cn('amount whitespace-nowrap tabular-nums', className)}>
      <span className="sr-only">{formatInr(value)}</span>
      <span aria-hidden>{formatInr(current)}</span>
    </span>
  );
}
