'use client';

import { useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { AnimatedAmount } from '@/components/kavach/animated-amount';

/**
 * Counts up the first value it is given (the first reveal of a saving). If the engine later
 * corrects the number (a billing answer, a new photo), the new value simply appears: a
 * correction never replays the count.
 */
export function CountOnce({
  value,
  className,
  delay,
}: {
  value: number;
  className?: string;
  delay?: number;
}) {
  const [first] = useState(value);
  return value === first ? (
    <AnimatedAmount value={value} className={className} delay={delay} />
  ) : (
    <Amount value={value} className={className} />
  );
}
