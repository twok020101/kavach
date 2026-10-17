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

/** A heading whose words rise one after another on first paint (landing hero). */
export function WordsRise({
  text,
  mark,
  as: Tag = 'h1',
  className,
}: {
  text: string;
  /** A phrase inside `text` that gets the marigold underline. */
  mark?: string;
  as?: 'h1' | 'h2' | 'p';
  className?: string;
}) {
  const at = mark ? text.indexOf(mark) : -1;
  const parts =
    mark && at >= 0
      ? [
          { text: text.slice(0, at), marked: false },
          { text: mark, marked: true },
          { text: text.slice(at + mark.length), marked: false },
        ]
      : [{ text, marked: false }];
  let index = 0;
  const words = (chunk: string) =>
    chunk
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word, i, all) => (
        <span key={`${word}-${index}`}>
          <span className="wr-word">
            <span style={{ '--w': index++ } as React.CSSProperties}>{word}</span>
          </span>
          {i < all.length - 1 ? ' ' : null}
        </span>
      ));
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {parts.map((part, i) => {
          if (!part.text.trim()) return null;
          // Keep a space between parts only where the source text had one ("moment." stays tight).
          const prev = parts[i - 1]?.text ?? '';
          const lead = i > 0 && (/\s$/.test(prev) || /^\s/.test(part.text)) ? ' ' : null;
          return part.marked ? (
            <span key={i}>
              {lead}
              <span className="mark">{words(part.text)}</span>
            </span>
          ) : (
            <span key={i}>
              {lead}
              {words(part.text)}
            </span>
          );
        })}
      </span>
    </Tag>
  );
}
