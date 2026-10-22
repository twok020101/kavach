'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Counts from 0 up to `value` the first time it is shown (ease-out cubic), then follows the
 * value at once: moving the date scrubber or a correction never replays the count.
 * Reduced motion shows the real value straight away.
 */
export function useCountOnce(value: number, durationMs = 900) {
  const reduce = useReducedMotion();
  const [done, setDone] = useState(false);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce || done) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setShown(Math.round(value * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduce, done]);
  return reduce || done ? value : shown;
}
