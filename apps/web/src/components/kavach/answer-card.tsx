'use client';

import type { DeskCard } from '@kavach/schemas';
import {
  Baby,
  BedDouble,
  Check,
  Copy,
  GitBranch,
  IdCard,
  Layers,
  MessageCircleQuestionMark,
  TriangleAlert,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';
import { Amount } from './amount';
import { AnimatedAmount } from './animated-amount';
import { VerifiedBadge } from './verified-badge';

const icons = {
  policy_order: IdCard,
  room_compare: BedDouble,
  ask_desk: MessageCircleQuestionMark,
  billing_branch: GitBranch,
  top_up_note: Layers,
  limit_cap: Baby,
  warning: TriangleAlert,
} satisfies Record<DeskCard['kind'], unknown>;

/** One desk answer card (S23): number, title, body, amounts, ✓ badge and rule IDs. */
export function AnswerCard({
  card,
  index,
  animate = false,
  children,
}: {
  card: DeskCard;
  index: number;
  /** Count the emphasised amount up when the card first appears (landing, first answer). */
  animate?: boolean;
  /** Extra controls under the card, e.g. "Compare rooms". */
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const tc = useTranslations('common');
  const Icon = icons[card.kind];
  const lines = card.body.split('\n').filter(Boolean);
  const warning = card.kind === 'warning';
  // Each "ask the desk" line can be copied on its own, to read out or paste to the family.
  const [copied, setCopied] = useState<number>();
  const copy = async (line: string, i: number) => {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(i);
      setTimeout(() => setCopied((c) => (c === i ? undefined : c)), 1500);
    } catch {
      // No clipboard (an old browser or a denied permission); the line is still on screen.
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      aria-labelledby={`${card.id}-title`}
      className={cn(
        'relative rounded-md border p-4 sm:p-5',
        warning ? 'border-partial/40 bg-partial-bg' : 'border-border bg-surface',
      )}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            warning ? 'bg-surface text-partial' : 'bg-primary-soft text-primary',
          )}
        >
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`${card.id}-title`} className="font-display text-xl font-bold leading-snug">
            {warning ? null : <span className="sr-only">{index + 1}. </span>}
            {card.title}
          </h3>
          {!warning && (
            <div className="mt-1">
              <VerifiedBadge verified={card.verified} />
            </div>
          )}
        </div>
        {!warning && <span className="label shrink-0 pt-1">0{index + 1}</span>}
      </header>

      {lines.length > 1 && card.kind === 'ask_desk' ? (
        <ul className="mt-3 flex flex-col gap-2 text-base">
          {lines.map((line, i) => (
            <li
              key={line}
              className="flex items-start gap-3 rounded-md border border-border bg-sunken p-3"
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface font-display text-sm font-bold text-primary-hover"
              >
                {i + 1}
              </span>
              <span className="flex-1 italic leading-relaxed">“{line}”</span>
              <button
                type="button"
                onClick={() => copy(line, i)}
                aria-label={copied === i ? tc('copied') : tc('copy')}
                className="press -my-1 flex size-12 shrink-0 items-center justify-center rounded-md text-muted hover:bg-primary-soft hover:text-primary"
              >
                {copied === i ? (
                  <Check aria-hidden className="size-5 text-safe" />
                ) : (
                  <Copy aria-hidden className="size-5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        lines.map((line) => (
          <p key={line} className="mt-3 text-lg">
            {line}
          </p>
        ))
      )}

      {card.amounts.length > 0 && (
        <dl className="mt-4 flex flex-col gap-2">
          {card.amounts.map((a, i) => (
            <div
              key={a.label}
              className={cn(
                'flex flex-col gap-0.5 rounded-sm px-3 py-2.5',
                a.emphasis ? 'bg-safe-bg text-safe' : 'bg-sunken',
              )}
            >
              <dt className={cn('label', a.emphasis && 'text-safe')}>{a.label}</dt>
              <dd>
                {a.emphasis && animate ? (
                  <AnimatedAmount
                    value={a.amount}
                    delay={200 + i * 80}
                    className="font-display text-3xl font-bold sm:text-4xl"
                  />
                ) : (
                  <Amount
                    value={a.amount}
                    className={cn(
                      'font-display font-bold',
                      a.emphasis ? 'text-3xl sm:text-4xl' : 'text-2xl',
                    )}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {children && <div className="mt-3 border-t border-border pt-2">{children}</div>}
    </motion.article>
  );
}
