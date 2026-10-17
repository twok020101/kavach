'use client';

import { Camera, Hospital, type LucideIcon, Pause, Play, Volume2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';
import { AnimatedAmount } from './animated-amount';

/**
 * The parts of the landing page that move. Everything here is slow and explanatory: a family
 * that appears one person at a time, the hospital moment told in three frames, and a soft light
 * that follows the pointer over the opening section. Reduced motion shows the final state.
 */

/** A section with a soft light that follows the pointer (mouse only). */
export function Spotlit({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--sx', `${e.clientX - r.left}px`);
      el.style.setProperty('--sy', `${e.clientY - r.top}px`);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, []);
  return (
    <section ref={ref} className={cn('spot', className)}>
      {children}
    </section>
  );
}

const TINTS = [
  'bg-primary-soft text-primary-hover',
  'bg-primary-soft text-primary-hover',
  'bg-safe-bg text-safe',
  'bg-partial-bg text-partial',
  'bg-partial-bg text-partial',
];

/** The household, one person after another: Kavach knows all of them. */
export function FamilyStrip({
  people,
  title,
  caption,
}: {
  people: { name: string; relation: string }[];
  title: string;
  caption: string;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-3">
      <p className="label">{title}</p>
      <ul className="flex flex-wrap gap-x-5 gap-y-3">
        {people.map((p, i) => (
          <motion.li
            key={p.name}
            className="flex items-center gap-2"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -10% 0px' }}
            transition={{ delay: i * 0.14, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              aria-hidden
              className={cn(
                'inline-flex size-10 items-center justify-center rounded-full font-display text-base font-bold',
                TINTS[i % TINTS.length],
              )}
            >
              {p.name.charAt(0)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-muted">{p.relation}</span>
            </span>
          </motion.li>
        ))}
      </ul>
      <p className="text-muted">{caption}</p>
    </div>
  );
}

export type StoryStep = { title: string; body: string };

const ICONS: LucideIcon[] = [Hospital, Camera, Volume2];
const STEP_MS = 3200;

/**
 * The hospital moment in three frames that advance on their own: the tap, the estimate, the
 * answer with the ₹90,000. It pauses on hover or focus, and the dots let a reader jump.
 */
export function MomentStoryboard({
  steps,
  saving,
  savingLabel,
  pauseLabel,
  playLabel,
}: {
  steps: [StoryStep, StoryStep, StoryStep];
  saving: number;
  savingLabel: string;
  pauseLabel: string;
  playLabel: string;
}) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(reduce ? 2 : 0);
  const [paused, setPaused] = useState(Boolean(reduce));
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (paused || hovered) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % steps.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [paused, hovered, steps.length]);

  const step = steps[index]!;
  const Icon = ICONS[index]!;

  return (
    <div
      className="story"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="story__screen" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={index}
            className="flex flex-col gap-3"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className={cn(
                'inline-flex size-12 items-center justify-center rounded-full',
                index === 0 ? 'bg-accent text-accent-ink' : 'bg-primary-soft text-primary',
              )}
            >
              <Icon aria-hidden className="size-6" />
            </span>
            <p className="font-display text-xl font-bold leading-snug">{step.title}</p>
            <p className="text-muted">{step.body}</p>
            {index === 2 && (
              <p className="mt-1 flex items-baseline justify-between gap-3 rounded-sm bg-safe-bg px-3 py-2 text-safe">
                <span className="font-semibold">{savingLabel}</span>
                <AnimatedAmount value={saving} className="font-display text-3xl font-bold" />
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {steps.map((s, i) => (
          <button
            key={s.title}
            type="button"
            aria-label={s.title}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => {
              setIndex(i);
              setPaused(true);
            }}
            className={cn(
              'press h-2.5 rounded-full transition-all',
              i === index ? 'w-8 bg-primary' : 'w-2.5 bg-border hover:bg-border-strong',
            )}
          />
        ))}
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? playLabel : pauseLabel}
          className="press ml-auto flex size-9 items-center justify-center rounded-full text-muted hover:bg-sunken hover:text-text"
        >
          {paused ? (
            <Play aria-hidden className="size-4" />
          ) : (
            <Pause aria-hidden className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * The opening statement: its words rise out of their baseline one after another on first paint.
 * `emphasis` is the trailing phrase set in the primary colour. Assistive tech reads the plain text.
 */
export function WordsRise({
  text,
  emphasis,
  className,
}: {
  text: string;
  emphasis?: string;
  className?: string;
}) {
  let index = 0;
  const words = (chunk: string, cls?: string) =>
    chunk
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word, i, all) => (
        <span key={`${word}-${index}`} className={cls}>
          <span className="wr-word">
            <span style={{ '--w': index++ } as React.CSSProperties}>{word}</span>
          </span>
          {i < all.length - 1 ? ' ' : null}
        </span>
      ));
  return (
    <h1 className={className}>
      <span className="sr-only">
        {text} {emphasis}
      </span>
      <span aria-hidden>
        {words(text)}
        {emphasis ? <> {words(emphasis, 'text-primary')}</> : null}
      </span>
    </h1>
  );
}
