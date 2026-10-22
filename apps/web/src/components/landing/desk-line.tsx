'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Icon } from '@/components/kavach/icon';

const noop = () => () => {};
const hasSpeech = () => 'speechSynthesis' in window;

/**
 * The line to say at the desk, in the desk's language (Hindi at the TPA counter in India,
 * Mandarin at the admissions counter in Singapore), with a speaker (the browser's own voice for
 * that language, when it has one) and a copy button. The words come from the messages, the
 * amounts from the engine.
 */
export function DeskLine({
  lang = 'hi',
  speechLang = 'hi-IN',
  line,
  label,
  hint,
  gloss,
  listen,
  stop,
  copy,
  copied,
}: {
  lang?: string;
  speechLang?: string;
  line: string;
  label: string;
  hint: string;
  gloss: string;
  listen: string;
  stop: string;
  copy: string;
  copied: string;
}) {
  const [speaking, setSpeaking] = useState(false);
  const [done, setDone] = useState(false);
  const canSpeak = useSyncExternalStore(noop, hasSpeech, () => false);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = speechLang;
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(line);
      setDone(true);
      window.setTimeout(() => setDone(false), 1800);
    } catch {
      // Clipboard blocked: the line is on screen to read out anyway.
    }
  };

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface-container-low p-4 sm:p-5 md:flex-row md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!canSpeak}
          aria-pressed={speaking}
          aria-label={speaking ? stop : listen}
          className="press flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-1 hover:bg-accent-hover disabled:opacity-50"
        >
          <Icon name={speaking ? 'stop' : 'volume_up'} className="text-2xl" />
        </button>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-label-caps font-bold uppercase text-secondary">{label}</span>
            <span className="font-serif text-citation-sm text-on-surface-variant">{hint}</span>
          </p>
          <p
            lang={lang}
            className="font-display text-base font-semibold leading-relaxed sm:text-lg"
          >
            “{line}”
          </p>
          <p className="font-serif text-citation-sm italic text-on-surface-variant">{gloss}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="press flex min-h-12 shrink-0 items-center gap-2 rounded-md bg-surface px-4 text-title-md font-semibold text-primary shadow-1 hover:bg-surface-container"
      >
        <Icon name={done ? 'check' : 'content_copy'} className="text-lg" />
        <span aria-live="polite">{done ? copied : copy}</span>
      </button>
    </div>
  );
}
