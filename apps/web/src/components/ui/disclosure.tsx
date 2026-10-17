'use client';

import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from './cn';

/** A button that shows and hides a region below it (used for "Why?" and "Compare rooms"). */
export function Disclosure({
  label,
  icon,
  defaultOpen = false,
  className,
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const id = useId();

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="press flex min-h-12 w-full items-center gap-2 rounded-md px-1 text-left font-semibold text-primary hover:bg-primary-soft"
      >
        {icon}
        <span className="flex-1">{label}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-5 transition-transform duration-150 ease-[var(--ease-out-strong)]',
            open && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
