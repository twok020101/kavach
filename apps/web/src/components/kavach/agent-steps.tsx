'use client';

import { Check, Circle } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../ui/cn';
import { Spinner } from '../ui/spinner';

export type AgentStep = { label: string; state: 'pending' | 'active' | 'done' };

/** What the agent is doing right now, step by step (never a bare spinner). */
export function AgentSteps({ steps, className }: { steps: AgentStep[]; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <ol aria-live="polite" className={cn('flex flex-col gap-2', className)}>
      {steps.map((step) => (
        <motion.li
          key={step.label}
          // The same first frame on the server and the client (no hydration mismatch); under
          // reduced motion only the short fade remains.
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.15, x: { duration: reduce ? 0.001 : 0.15 } }}
          className={cn(
            'flex items-center gap-2',
            step.state === 'pending' ? 'text-muted' : 'text-text',
            step.state === 'active' && 'font-semibold',
          )}
        >
          {step.state === 'done' && <Check aria-hidden className="size-5 text-safe" />}
          {step.state === 'active' && <Spinner className="text-primary" />}
          {step.state === 'pending' && <Circle aria-hidden className="size-5" />}
          <span>{step.label}</span>
        </motion.li>
      ))}
    </ol>
  );
}
