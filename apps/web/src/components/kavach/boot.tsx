'use client';

import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useSyncExternalStore } from 'react';

const RUN_MS = 2600;
const LIFT_MS = 640;
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const root = () => document.documentElement;

/**
 * Whether this load gets the opening, decided once. public/theme.js normally marks it before
 * first paint; the same rule is applied here in case that script ran late, so the opening never
 * depends on a race (landing route, not reduced motion, first visit in this tab or a refresh, or ?boot=1).
 */
let wanted: boolean | undefined;
const noop = () => () => {};
function decide(): boolean {
  if (root().classList.contains('booting')) return true;
  try {
    const landing = /^\/(en|hi)?\/?$/.test(location.pathname);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const force = /[?&]boot=1(&|$)/.test(location.search);
    const nav = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    const reload = nav?.type === 'reload';
    const yes =
      landing && (force || (!reduced && (reload || !sessionStorage.getItem('kavach.booted'))));
    if (yes) root().classList.add('booting');
    return yes;
  } catch {
    return false;
  }
}
const readWanted = () => (wanted ??= decide());

/**
 * The opening on a first visit to the landing page. One authored moment, the brand story told in
 * motion: two arcs, two people, draw up from the base towards each other and meet as the shield
 * while a warm light rises behind them; the name settles up through a mask; three quiet lines
 * say what is already in place, each tick drawing itself; then the panel lifts, its content
 * lagging a little for depth, and the page rises underneath. About two and a half seconds, once
 * per tab, never on app or hospital routes. A tap, a key or reduced motion skips it. Nothing
 * counts, flashes or hurries anyone. A refresh of the landing page plays it again.
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
          timers.push(window.setTimeout(finish, 200)),
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
    { at: 950, text: t('policies') },
    { at: 1450, text: t('rules') },
    { at: 1950, text: t('beside') },
  ];
  const progress = Math.min(1, elapsed / RUN_MS);

  return (
    <div
      aria-hidden
      className={`boot${leaving ? ' is-leaving' : ''}`}
      style={{ '--lift': `${LIFT_MS}ms` } as React.CSSProperties}
    >
      <div className="boot__inner">
        <div className="boot__brand">
          <svg viewBox="0 0 32 32" className="boot__shield" aria-hidden>
            {/* The left person, drawn from the base up towards the meeting point */}
            <motion.path
              d="M15 28C9.2 26 5 21.6 5 15V7.5L15 4"
              fill="none"
              stroke="#8FA3F0"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, ease: EASE_OUT }}
            />
            {/* The right person, drawn to meet the left */}
            <motion.path
              d="M17 28c5.8-2 10-6.4 10-13V7.5L17 4"
              fill="none"
              stroke="#F4A62A"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.1, ease: EASE_OUT }}
            />
            <motion.circle
              cx="12"
              cy="13"
              r="2.2"
              fill="#8FA3F0"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.35, ease: EASE_OUT }}
            />
            <motion.circle
              cx="20"
              cy="13"
              r="2.2"
              fill="#F4A62A"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.35, ease: EASE_OUT }}
            />
          </svg>
          <div className="boot__name">
            <span className="boot__word">
              <span>Kavach</span>
            </span>
            <span className="boot__deva" lang="hi">
              कवच
            </span>
          </div>
        </div>

        <ol className="boot__lines">
          {lines.map((line) =>
            elapsed >= line.at ? (
              <li key={line.text} className="boot__line">
                <svg viewBox="0 0 20 20" className="boot__tick" aria-hidden>
                  <path
                    d="M4 10.5l4 4 8-9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
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
