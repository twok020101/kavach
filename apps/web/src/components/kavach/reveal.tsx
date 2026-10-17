'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * Fades its content up once as it scrolls into view. The motion is a CSS transition
 * (`.rv` in globals.css), so it stays smooth while React is busy, and reduced motion gets none.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
}: {
  children: ReactNode;
  /** Seconds to wait, for a stagger across siblings. */
  delay?: number;
  as?: 'div' | 'li' | 'section';
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('in');
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    // Printing, odd browsers, screenshots: nothing stays hidden for long.
    const fallback = setTimeout(() => el.classList.add('in'), 4000);
    return () => {
      io.disconnect();
      clearTimeout(fallback);
    };
  }, []);
  const Component = Tag as 'div';
  return (
    <Component
      ref={ref as never}
      className={cn('rv', className)}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Component>
  );
}
