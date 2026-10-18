'use client';

import { Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { cn } from '../ui/cn';

const MAX_SECONDS = 30;

export type VoiceNote = { mimeType: string; data: string; seconds: number };

/** Hold to record up to 30 s; the recording goes to the agent as audio (Hindi or English). */
export function HoldToSpeak({ onRecorded }: { onRecorded: (note: VoiceNote) => void }) {
  const t = useTranslations('setup.family');
  const [recording, setRecording] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const started = useRef(0);

  const start = async () => {
    if (recorder.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstart = (e) => (started.current = e.timeStamp);
      rec.onstop = async (e) => {
        stream.getTracks().forEach((track) => track.stop());
        recorder.current = null;
        const blob = new Blob(chunks, { type: rec.mimeType });
        const seconds = Math.round((e.timeStamp - started.current) / 1000);
        if (seconds < 1) return;
        onRecorded({ mimeType: rec.mimeType.split(';')[0]!, data: await toBase64(blob), seconds });
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      setTimeout(stop, MAX_SECONDS * 1000);
    } catch {
      setBlocked(true);
    }
  };
  const stop = () => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
    setRecording(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && start()}
        onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && stop()}
        aria-pressed={recording}
        className={cn(
          'press flex min-h-12 select-none items-center gap-2 rounded-full border-2 px-5 font-semibold',
          recording
            ? 'border-accent bg-accent text-accent-ink ring-8 ring-accent/20'
            : 'border-primary bg-surface text-primary hover:bg-primary-soft',
        )}
      >
        <Mic aria-hidden className={cn('size-5', recording && 'animate-pulse')} />
        {recording ? t('listening') : t('speak')}
      </button>
      {blocked && <p className="text-sm text-partial">{t('micBlocked')}</p>}
    </div>
  );
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
