'use client';

import { Check, Copy, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/**
 * "Ask the admission desk right now" (Stitch desk): the questions for the desk and the line
 * Kavach speaks, each a quote the family can read out or copy; then one link to send them on
 * WhatsApp (no number: the family picks the chat).
 */
export function AskDeskPanel({
  questions,
  say,
  shareHref,
}: {
  /** The engine's question for the desk first, then the answer's own "ask the desk" lines. */
  questions: string[];
  /** The spoken line of the answer, verbatim from the API. */
  say?: string;
  shareHref: string;
}) {
  const t = useTranslations('desk.session.askDesk');
  const ts = useTranslations('desk.session');
  const tc = useTranslations('common');
  const [copied, setCopied] = useState<string>();
  const copy = async (line: string) => {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(line);
      setTimeout(() => setCopied((c) => (c === line ? undefined : c)), 1500);
    } catch {
      // No clipboard (an old browser or a denied permission); the line is still on screen.
    }
  };

  const quote = (heading: string, line: string) => (
    <li
      key={heading + line}
      className="flex items-start gap-2 rounded-md border border-border bg-sunken p-3"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{heading}</p>
        <p className="mt-1 text-base italic leading-relaxed text-muted">“{line}”</p>
      </div>
      <button
        type="button"
        onClick={() => copy(line)}
        aria-label={copied === line ? tc('copied') : tc('copy')}
        className="press -m-1 flex size-12 shrink-0 items-center justify-center rounded-md text-muted hover:bg-primary-soft hover:text-primary"
      >
        {copied === line ? (
          <Check aria-hidden className="size-5 text-safe" />
        ) : (
          <Copy aria-hidden className="size-5" />
        )}
      </button>
    </li>
  );

  return (
    <Card as="section" aria-labelledby="ask-desk-title" className="flex flex-col gap-3">
      <h2
        id="ask-desk-title"
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider"
      >
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
        {t('title')}
      </h2>
      <p className="text-sm text-muted">{t('intro')}</p>
      <ul className="flex flex-col gap-2">
        {questions.map((q, i) => quote(`${i + 1}. ${t('ask')}`, q))}
        {say && quote(t('say'), say)}
      </ul>
      <a
        href={shareHref}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClasses({
          variant: 'secondary',
          size: 'md',
          className: 'min-h-12 border-safe/40 bg-safe-bg/40 px-4 text-center text-safe',
        })}
      >
        <MessageCircle aria-hidden className="size-5 shrink-0" />
        {ts('sendPrompts')}
      </a>
    </Card>
  );
}
