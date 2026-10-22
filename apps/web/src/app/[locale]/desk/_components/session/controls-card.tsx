'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent, RefObject } from 'react';
import { Icon } from '@/components/kavach/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';

export type FallbackKey = 'connection_lost' | 'mic_denied' | 'time_limit' | 'other';

/**
 * "Quick desk controls" (Stitch desk co-pilot). On a laptop it is the first card of the right
 * column; on a phone the same controls form the dock fixed to the bottom of the screen, with
 * 64 px targets. Text mode: the marigold "Talk to Kavach" and the question box. Live voice:
 * "Show the estimate", mute and "type instead" (the box stays on a laptop).
 */
export function ControlsCard({
  live,
  muted,
  connecting,
  busy,
  fallback,
  onRetry,
  onDismiss,
  onTalk,
  onStop,
  onShowEstimate,
  onToggleMute,
  question,
  onQuestion,
  onSubmit,
  questionRef,
  suggestions,
  onSuggest,
}: {
  live: boolean;
  muted: boolean;
  connecting: boolean;
  busy: boolean;
  fallback?: FallbackKey;
  onRetry: () => void;
  onDismiss: () => void;
  onTalk: () => void;
  onStop: () => void;
  onShowEstimate: () => void;
  onToggleMute: () => void;
  question: string;
  onQuestion: (text: string) => void;
  onSubmit: (event: FormEvent) => void;
  questionRef: RefObject<HTMLTextAreaElement | null>;
  /** Quick questions under the box (laptop), once the estimate is read. */
  suggestions?: string[];
  onSuggest: (text: string) => void;
}) {
  const t = useTranslations('desk.session');
  const tl = useTranslations('live');

  return (
    <aside
      aria-label={t('controls')}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-2 backdrop-blur-md lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:pb-0 lg:shadow-none lg:backdrop-blur-none"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-4 py-3 lg:max-w-none lg:gap-3 lg:rounded-xl lg:border lg:border-border lg:bg-surface lg:p-5 lg:shadow-1">
        <h2 className="mb-1 hidden text-xs font-bold uppercase tracking-wider text-muted lg:block">
          {t('controls')}
        </h2>

        {live ? (
          <>
            <Button
              variant="accent"
              size="desk"
              className="justify-between rounded-xl px-5 text-left"
              disabled={busy}
              onClick={onShowEstimate}
            >
              <span className="flex items-center gap-3">
                <Icon name="photo_camera" className="text-2xl" />
                {tl('showEstimate')}
              </span>
              <Icon name="chevron_right" className="text-2xl opacity-70" />
            </Button>
            <div className="grid grid-cols-2 gap-2.5">
              <Button
                variant={muted ? 'secondary' : 'primary'}
                className="min-h-16 lg:min-h-12"
                aria-pressed={muted}
                disabled={connecting}
                onClick={onToggleMute}
              >
                <Icon name={muted ? 'mic' : 'mic_off'} className="text-xl" />
                <span className="truncate">{muted ? tl('unmute') : tl('muteShort')}</span>
              </Button>
              <Button variant="secondary" className="min-h-16 lg:min-h-12" onClick={onStop}>
                <Icon name="keyboard" className="text-xl" />
                <span className="truncate">{tl('typeInstead')}</span>
              </Button>
            </div>
          </>
        ) : fallback ? (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border-2 border-partial bg-partial-bg p-3 text-sm text-text"
          >
            <p className="flex items-center gap-2 font-semibold text-partial">
              <Icon name="warning" className="text-xl" />
              {tl('fallback.title')}
            </p>
            <p>{tl(`fallback.${fallback}`)}</p>
            <div className="flex flex-wrap gap-2">
              {fallback !== 'time_limit' && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  <Icon name="mic" className="text-xl" />
                  {tl('fallback.retry')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                {tl('fallback.dismiss')}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="accent"
            size="desk"
            className="justify-between rounded-xl px-5 text-left"
            onClick={onTalk}
          >
            <span className="flex items-center gap-3">
              <Icon name="mic" fill className="text-2xl" />
              {tl('talk')}
            </span>
            <Icon name="chevron_right" className="text-2xl opacity-70" />
          </Button>
        )}

        <form
          onSubmit={onSubmit}
          className={cn('flex items-stretch gap-2', live && 'hidden lg:flex')}
        >
          <label htmlFor="desk-question" className="sr-only">
            {t('questionLabel')}
          </label>
          {/* Grows with the question (up to five lines) so every word stays in view; Enter sends, Shift+Enter breaks a line. */}
          <textarea
            id="desk-question"
            ref={questionRef}
            rows={1}
            value={question}
            onChange={(e) => onQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={t('questionPlaceholder')}
            autoComplete="off"
            className="max-h-44 min-h-16 min-w-0 flex-1 resize-none rounded-lg border-2 border-border bg-surface px-3.5 py-4 text-lg leading-snug placeholder:text-muted focus-visible:border-primary lg:min-h-12 lg:py-3 lg:text-base"
          />
          <Button
            type="submit"
            className="min-h-16 min-w-16 shrink-0 rounded-lg px-0 lg:min-h-12 lg:min-w-12"
            aria-label={t('send')}
            disabled={busy || !question.trim()}
          >
            <Icon name="send" fill className="text-2xl" />
          </Button>
        </form>

        {suggestions && suggestions.length > 0 && (
          <div className="hidden flex-col gap-1.5 lg:flex">
            <p className="text-xs font-medium text-muted">{t('askTitle')}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => onSuggest(s)}
                  className="press inline-flex min-h-12 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-primary-hover hover:border-primary/30 hover:bg-primary-soft disabled:opacity-50"
                >
                  <Icon name="chat_bubble" className="text-base" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
