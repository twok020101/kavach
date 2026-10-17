'use client';

import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';

const RUN_MS = 2400;
const LIFT_MS = 720;
const root = () => document.documentElement;

/** Whether public/theme.js marked this load for the opening; decided once, before React ran. */
let wanted: boolean | undefined;
const noop = () => () => {};
const readWanted = () => (wanted ??= root().classList.contains('booting'));

/**
 * The opening on a first visit to the landing page: the shield draws itself, three quiet lines
 * say what is already in place, and the panel lifts into the page. About two and a half seconds,
 * once per tab, never on app or hospital routes (public/theme.js decides before first paint).
 * A tap, a key or reduced motion skips it. Nothing here counts, flashes or hurries anyone.
 */
export function Boot() {
  const t = useTranslations('landing.boot');
  const active = useSyncExternalStore(noop, readWanted, () => false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Never leave the page hidden: if the mark arrived after React, clear it and skip the opening.
    if (!active) {
      root().classList.remove('booting');
      return;
    }
    let frame = 0;
    const timers: number[] = [];
    const start = performance.now();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      setLeaving(true);
      root().classList.remove('booting');
      try {
        sessionStorage.setItem('kavach.booted', '1');
      } catch {
        // Private mode: the opening simply plays again next time.
      }
      timers.push(window.setTimeout(() => setGone(true), LIFT_MS + 60));
    };

    const tick = (now: number) => {
      const ms = now - start;
      setElapsed(ms);
      if (ms < RUN_MS) frame = requestAnimationFrame(tick);
      else {
        const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
        Promise.race([fonts, new Promise((r) => timers.push(window.setTimeout(r, 800)))]).then(() =>
          timers.push(window.setTimeout(finish, 240)),
        );
      }
    };
    frame = requestAnimationFrame(tick);

    const skip = () => finish();
    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });
    // Whatever happens, the page is never held for long.
    timers.push(window.setTimeout(finish, RUN_MS + 2000));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
    };
  }, [active]);

  if (!active || gone) return null;

  const lines = [
    { at: 700, text: t('policies') },
    { at: 1300, text: t('rules') },
    { at: 1900, text: t('beside') },
  ];
  const progress = Math.min(1, elapsed / RUN_MS);

  return (
    <div
      aria-hidden
      className={`boot${leaving ? ' is-leaving' : ''}`}
      style={{ transitionDuration: `${LIFT_MS}ms` }}
    >
      <div className="boot__inner">
        <div className="boot__brand">
          <svg viewBox="0 0 32 32" className="boot__shield" aria-hidden>
            <motion.path
              d="M15 4 5 7.5V15c0 6.6 4.2 11 10 13"
              fill="none"
              stroke="#8FA3F0"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.path
              d="M17 4l10 3.5V15c0 6.6-4.2 11-10 13"
              fill="none"
              stroke="#F4A62A"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.circle
              cx="12"
              cy="13"
              r="2.2"
              fill="#8FA3F0"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            />
            <motion.circle
              cx="20"
              cy="13"
              r="2.2"
              fill="#F4A62A"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.95, duration: 0.3 }}
            />
          </svg>
          <motion.div
            className="boot__name"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <span className="boot__word">Kavach</span>
            <span className="boot__deva" lang="hi">
              कवच
            </span>
          </motion.div>
        </div>

        <ol className="boot__lines">
          {lines.map((line) =>
            elapsed >= line.at ? (
              <li key={line.text} className="boot__line">
                <Check aria-hidden className="size-4 shrink-0" strokeWidth={3} />
                <span>{line.text}</span>
              </li>
            ) : null,
          )}
        </ol>

        <div className="boot__foot">
          <p className="boot__tagline">{t('tagline')}</p>
          <div className="boot__rail">
            <i style={{ transform: `scaleX(${progress})` }} />
          </div>
          <p className="boot__skip">{t('skip')}</p>
        </div>
      </div>
    </div>
  );
}
