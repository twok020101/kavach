'use client';

import type { DeskCard, Locale } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState, type CSSProperties } from 'react';
import { Icon } from '@/components/kavach/icon';
import { cn } from '@/components/ui/cn';

/**
 * "Ask the admission desk right now" (Stitch desk co-pilot): the engine's exact lines from the
 * ask-desk card, numbered, each with a copy button; the one question for the desk when the
 * engine has one; and the lines handed to the family on WhatsApp (they pick the chat). The
 * language chip names the language the lines are actually in.
 */
export function PromptsCard({
  card,
  question,
  language,
}: {
  /** The ask-desk card of the current answer, once there is one. */
  card?: DeskCard;
  /** The engine's single question for the desk, if any. */
  question?: string;
  language: Locale;
}) {
  const t = useTranslations('desk.session');
  const tc = useTranslations('common');
  const lines = card?.body.split('\n').filter(Boolean) ?? [];
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

  const shareText = [card ? `${card.title}\n${card.body}` : '', question ?? '']
    .filter(Boolean)
    .join('\n');

  return (
    <section
      aria-labelledby="prompts-title"
      data-desk-prompts={lines.length > 0 ? '' : undefined}
      className="rise-in flex flex-col gap-3.5 rounded-xl border border-border bg-surface p-5 shadow-1"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id="prompts-title" className="flex items-center gap-2 text-text">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
          <span className="text-xs font-bold uppercase tracking-wider">{t('prompts.title')}</span>
        </h3>
        <span lang={language} className="shrink-0 text-xs font-medium text-muted">
          {tc(`languages.${language}`)}
        </span>
      </div>

      {lines.length === 0 && !question ? (
        <p className="rounded-lg border border-dashed border-border bg-sunken p-3 text-sm text-muted">
          {t('prompts.empty')}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">{t('prompts.intro')}</p>
          <ol lang={language} className="stagger flex flex-col gap-2.5">
            {lines.map((line, i) => (
              <li
                key={line}
                style={{ '--i': i } as CSSProperties}
                className="group flex items-start gap-3 rounded-lg border border-border bg-sunken p-3 transition-colors hover:bg-primary-soft/60"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface font-display text-xs font-bold text-primary-hover"
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-base leading-relaxed text-text">“{line}”</span>
                <CopyButton
                  done={copied === i}
                  label={copied === i ? tc('copied') : tc('copy')}
                  onClick={() => copy(line, i)}
                />
              </li>
            ))}
            {question && (
              <li className="flex items-start gap-3 rounded-lg border border-accent/50 bg-accent-soft p-3">
                <Icon name="contact_support" className="mt-0.5 text-xl text-accent-ink" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-muted">
                    {t('prompts.deskQuestion')}
                  </span>
                  <span className="text-base leading-relaxed text-text">“{question}”</span>
                </span>
                <CopyButton
                  done={copied === -1}
                  label={copied === -1 ? tc('copied') : tc('copy')}
                  onClick={() => copy(question, -1)}
                />
              </li>
            )}
          </ol>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-safe/40 bg-safe-bg px-4 text-center text-sm font-semibold text-safe hover:brightness-95"
          >
            <Icon name="chat" className="text-xl" />
            {t('sendPrompts')}
          </a>
        </>
      )}
    </section>
  );
}

function CopyButton({
  done,
  label,
  onClick,
}: {
  done: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'press -my-2 -mr-2 flex size-12 shrink-0 items-center justify-center rounded-md hover:bg-surface',
        done ? 'text-safe' : 'text-muted group-hover:text-primary',
      )}
    >
      <Icon name={done ? 'check' : 'content_copy'} className="text-xl" />
    </button>
  );
}
