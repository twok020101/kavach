'use client';

import { useTranslations } from 'next-intl';
import { Icon } from '@/components/kavach/icon';
import { ListeningOrb, type OrbState } from '@/components/kavach/listening-orb';
import { cn } from '@/components/ui/cn';

/**
 * The orb stage (Stitch desk co-pilot): a "Live voice" chip that pings only while the voice line
 * is open, the mute control while it is, the big orb and what Kavach is doing in words. In text
 * mode the orb rests and the hint says how to start talking.
 */
export function OrbCard({
  live,
  state,
  label,
  hint,
  muted,
  muteDisabled,
  onToggleMute,
  className,
}: {
  live: boolean;
  state: OrbState;
  label: string;
  hint: string;
  muted: boolean;
  muteDisabled?: boolean;
  onToggleMute: () => void;
  className?: string;
}) {
  const t = useTranslations('desk.session.status');
  return (
    <section
      aria-label={label}
      className={cn(
        'rise-in relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface p-5 shadow-1',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold',
            live
              ? 'border-primary/20 bg-primary-soft text-primary-hover'
              : 'border-border bg-sunken text-muted',
          )}
        >
          <Icon name={live ? 'mic' : 'mic_off'} className="text-base" />
          {live ? t('live') : t('voiceOff')}
          {live && <span aria-hidden className="live-dot desk-live" />}
        </span>
        {live && (
          <button
            type="button"
            onClick={onToggleMute}
            disabled={muteDisabled}
            aria-pressed={muted}
            className="press inline-flex min-h-12 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-muted hover:bg-sunken hover:text-text disabled:opacity-50"
          >
            <Icon name={muted ? 'mic' : 'mic_off'} className="text-lg" />
            {muted ? t('unmute') : t('mute')}
          </button>
        )}
      </div>
      <div className="flex flex-col items-center px-2 pb-3 pt-14 text-center">
        <ListeningOrb size="lg" state={state} label={label} />
        <p className="mt-2 max-w-xs text-sm text-muted">{hint}</p>
      </div>
    </section>
  );
}
