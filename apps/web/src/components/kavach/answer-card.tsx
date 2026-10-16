'use client';

import type { DeskCard } from '@kavach/schemas';
import {
  BedDouble,
  GitBranch,
  IdCard,
  Layers,
  MessageCircleQuestionMark,
  TriangleAlert,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from '../ui/cn';
import { Amount } from './amount';
import { RuleId, VerifiedBadge } from './verified-badge';

const icons = {
  policy_order: IdCard,
  room_compare: BedDouble,
  ask_desk: MessageCircleQuestionMark,
  billing_branch: GitBranch,
  top_up_note: Layers,
  warning: TriangleAlert,
} satisfies Record<DeskCard['kind'], unknown>;

/** One desk answer card (S23): number, title, body, amounts, ✓ badge and rule IDs. */
export function AnswerCard({
  card,
  index,
  children,
}: {
  card: DeskCard;
  index: number;
  /** Extra controls under the card, e.g. "Compare rooms". */
  children?: ReactNode;
}) {
  const t = useTranslations('common');
  const reduce = useReducedMotion();
  const Icon = icons[card.kind];
  const lines = card.body.split('\n').filter(Boolean);
  const warning = card.kind === 'warning';

  return (
    <motion.article
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
      aria-labelledby={`${card.id}-title`}
      className={cn(
        'rounded-md border p-4',
        warning ? 'border-partial/40 bg-partial-bg' : 'border-border bg-surface shadow-sm',
      )}
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
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
      </header>

      {lines.length > 1 && card.kind === 'ask_desk' ? (
        <ul className="mt-3 flex list-disc flex-col gap-1 pl-6 text-lg">
          {lines.map((line) => (
            <li key={line}>{line}</li>
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
          {card.amounts.map((a) => (
            <div
              key={a.label}
              className={cn(
                'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-sm px-3 py-2',
                a.emphasis ? 'bg-safe-bg text-safe' : 'bg-sunken',
              )}
            >
              <dt className={cn(a.emphasis ? 'font-semibold' : 'text-muted')}>{a.label}</dt>
              <dd>
                <Amount
                  value={a.amount}
                  className={cn('font-display font-bold', a.emphasis ? 'text-3xl' : 'text-2xl')}
                />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {card.ruleIds.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <span>{t('rules')}</span>
          {card.ruleIds.map((id) => (
            <RuleId key={id} id={id} />
          ))}
        </p>
      )}

      {children && <div className="mt-3 border-t border-border pt-2">{children}</div>}
    </motion.article>
  );
}
