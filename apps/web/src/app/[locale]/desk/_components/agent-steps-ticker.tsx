'use client';

import { useEffect, useState } from 'react';
import { AgentSteps } from '@/components/kavach/agent-steps';

/**
 * Walks through `labels` while `running`, then shows them all done.
 * Mount with a new `key` for each operation so it starts from the first step.
 */
export function AgentStepsTicker({ labels, running }: { labels: string[]; running: boolean }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setCurrent((i) => Math.min(i + 1, labels.length - 1)), 600);
    return () => clearInterval(id);
  }, [running, labels.length]);

  return (
    <AgentSteps
      steps={labels.map((label, i) => ({
        label,
        state: !running || i < current ? 'done' : i === current ? 'active' : 'pending',
      }))}
    />
  );
}
