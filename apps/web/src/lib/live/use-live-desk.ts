'use client';

import type {
  BillingType,
  DeskAnswer,
  DeskCard,
  HospitalEstimate,
  LiveErrorCode,
  Locale,
} from '@kavach/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { openMic, type Mic } from '../audio/mic';
import { openPlayer, type Player } from '../audio/player';
import { LiveSocket } from './live-socket';

export type LiveStatus =
  'off' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'reconnecting';
export type LiveFallback = LiveErrorCode | 'connection_lost' | 'mic_denied';

export type LiveHandlers = {
  caption(role: 'user' | 'agent', text: string, final: boolean): void;
  step(label: string, state: 'start' | 'done'): void;
  estimate(estimate: HospitalEstimate): void;
  answer(answer: DeskAnswer): void;
  card(card: DeskCard): void;
  turnComplete(): void;
  /** Live stopped working; the screen switches to text mode and says why. */
  fallback(reason: LiveFallback): void;
};

/** The live desk in the browser: mic → socket → speaker, with captions and cards as events. */
export function useLiveDesk(sessionId: string, language: Locale, handlers: LiveHandlers) {
  const [status, setStatus] = useState<LiveStatus>('off');
  const [muted, setMuted] = useState(false);
  const on = useRef(handlers);
  const parts = useRef<{ socket?: LiveSocket; mic?: Mic; player?: Player }>({});
  const busy = useRef(0);

  useEffect(() => {
    on.current = handlers;
  });

  const shutdown = useCallback((end: boolean) => {
    const { socket, mic, player } = parts.current;
    if (end) socket?.end();
    else socket?.close();
    mic?.stop();
    player?.close();
    parts.current = {};
    busy.current = 0;
    setStatus('off');
    setMuted(false);
  }, []);

  const start = useCallback(async () => {
    if (parts.current.socket) return;
    setStatus('connecting');
    const fallback = (reason: LiveFallback) => {
      shutdown(false);
      on.current.fallback(reason);
    };

    const socket = new LiveSocket(sessionId, language, {
      message(m) {
        const h = on.current;
        switch (m.type) {
          case 'ready':
            return setStatus('listening');
          case 'audio':
            return parts.current.player?.play(m.data);
          case 'interrupted':
            return parts.current.player?.flush();
          case 'caption':
            return h.caption(m.role, m.text, m.final);
          case 'step':
            busy.current += m.state === 'start' ? 1 : -1;
            setStatus((s) => (s === 'speaking' ? s : busy.current > 0 ? 'thinking' : 'listening'));
            return h.step(m.label, m.state);
          case 'estimate':
            return h.estimate(m.estimate);
          case 'answer':
            return h.answer(m.answer);
          case 'card':
            return h.card(m.card);
          case 'turnComplete':
            return h.turnComplete();
        }
      },
      reconnecting: () => setStatus('reconnecting'),
      fallback,
    });
    parts.current.socket = socket;

    try {
      // Both audio contexts are created here, inside the tap that started live mode.
      parts.current.player = await openPlayer((playing) =>
        setStatus(playing ? 'speaking' : busy.current > 0 ? 'thinking' : 'listening'),
      );
      parts.current.mic = await openMic((chunk) => socket.send({ type: 'audio', data: chunk }));
    } catch {
      return fallback('mic_denied');
    }
    await socket.connect().catch(() => fallback('connection_lost'));
  }, [sessionId, language, shutdown]);

  useEffect(() => () => shutdown(false), [shutdown]);

  // The language switch can keep this page mounted; an open live session must follow it.
  useEffect(() => {
    parts.current.socket?.setLanguage(language);
  }, [language]);

  return {
    status,
    muted,
    start,
    /** `end` also ends the live model session; without it a later start resumes it. */
    stop: (end = false) => shutdown(end),
    /** Muting ends the person's turn, so the agent answers. */
    toggleMute() {
      const next = !muted;
      parts.current.mic?.setMuted(next);
      if (next) parts.current.socket?.send({ type: 'audioEnd' });
      setMuted(next);
    },
    capture: () => parts.current.socket?.send({ type: 'capture' }),
    text: (text: string) => parts.current.socket?.send({ type: 'text', text }),
    billingAnswer: (billingType: BillingType) =>
      parts.current.socket?.send({ type: 'billingAnswer', billingType }),
  };
}
