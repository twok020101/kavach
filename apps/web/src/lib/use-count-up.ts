'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/** Counts from 0 to `value` once (ease-out cubic); the real value at once under reduced motion. */
export function useCountUp(value: number, durationMs = 800) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduce]);
  return reduce ? value : shown;
}
