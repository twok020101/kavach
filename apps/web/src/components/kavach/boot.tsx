'use client';

import { formatInr } from '@kavach/engine';
import { useTranslations } from 'next-intl';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '../ui/cn';
import { BrandPanel } from './brand-panel';
import { Icon } from './icon';
import { LanguageSwitch } from './language-switch';
import { LogoMark } from './logo';
import { ThemeToggle } from './theme-toggle';

/** The rail fills in this long, the three checks landing on the way. */
const RUN_MS = 2200;
/** Then the gateway waits for the visitor, but never longer than this. */
const HOLD_MS = 6000;
const LIFT_MS = 640;
const CHECKS_AT = [500, 1000, 1500] as const;
const root = () => document.documentElement;
/** The landing page in any configured locale: "/", "/en", "/hi/" and so on, nothing deeper. */
const LANDING = new RegExp(`^/(${routing.locales.join('|')})?/?$`);

/**
 * Whether this load gets the opening, decided once. public/theme.js normally marks it before
 * first paint; the same rule is applied here in case that script ran late, so the opening never
 * depends on a race (landing route, not reduced motion, first visit in this tab or a refresh, or ?boot=1).
 */
let wanted: boolean | undefined;
const noop = () => () => {};
function decide(): boolean {
  try {
    const landing = LANDING.test(location.pathname);
    if (root().classList.contains('booting')) {
      // theme.js accepts any two-letter prefix; only a configured locale's landing keeps the mark.
      if (landing) return true;
      root().classList.remove('booting');
      return false;
    }
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
 * The opening on a first visit to the landing page: the Stitch launch gateway. On a laptop the
 * indigo brand panel sits on the left and the dark gateway card on the right; on a phone the card
 * fills the screen. Three checks land as the rail fills, then the card waits for "Enter Kavach",
 * a tap anywhere, Space, Enter or Escape, and lifts away with the page rising underneath. It
 * never waits more than a few seconds, plays once per tab (a refresh plays it again), never on
 * app or hospital routes, and not at all under reduced motion unless ?boot=1 asks for it.
 */
export function Boot({ saving, rulesCount }: { saving: number; rulesCount: number }) {
  const t = useTranslations('landing.gateway');
  const tb = useTranslations('landing.boot');
  const active = useSyncExternalStore(noop, readWanted, () => false);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const finishRef = useRef<() => void>(() => {});
  const enterRef = useRef<HTMLButtonElement>(null);

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

    function onKey(e: KeyboardEvent) {
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'Escape') return;
      // A focused link or button activates itself (and finishes from its own handler).
      if (e.key !== 'Escape' && (e.target as Element | null)?.closest?.('a, button')) return;
      e.preventDefault();
      finish();
    }

    function finish() {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      setLeaving(true);
      root().classList.remove('booting');
      try {
        sessionStorage.setItem('kavach.booted', '1');
      } catch {
        // Private mode: the opening simply plays again next time.
      }
      timers.push(window.setTimeout(() => setGone(true), LIFT_MS + 60));
    }
    finishRef.current = finish;

    const tick = (now: number) => {
      const ms = now - start;
      setElapsed(ms);
      if (ms < RUN_MS) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener('keydown', onKey);
    enterRef.current?.focus({ preventScroll: true });
    // Whatever happens, the page is never held for long.
    timers.push(window.setTimeout(finish, RUN_MS + HOLD_MS));

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  if (!active || gone) return null;

  const progress = Math.min(1, elapsed / RUN_MS);
  const done = progress >= 1;
  const checks = [
    { icon: 'verified', title: tb('policies'), sub: t('policiesSub'), tick: t('tickPolicies') },
    { icon: 'shield', title: tb('rules'), sub: t('rulesSub'), tick: t('tickRules') },
    { icon: 'lock_person', title: tb('beside'), sub: t('besideSub'), tick: t('tickBeside') },
  ].map((c, i) => ({ ...c, lit: elapsed >= CHECKS_AT[i]! }));

  // A tap anywhere on the gateway continues.
  const onTap = (e: MouseEvent) => {
    // Buttons (Enter, the theme toggle) handle themselves; a link (the brand, EN/हिं, demo)
    // lifts the gateway and then navigates.
    if ((e.target as Element).closest('button')) return;
    finishRef.current();
  };
  const finish = () => finishRef.current();
  const rise = (i: number) => ({ '--i': i }) as CSSProperties;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gw-title"
      className={cn('gw', leaving && 'is-leaving')}
      style={{ '--lift': `${LIFT_MS}ms` } as CSSProperties}
      onClick={onTap}
    >
      <BrandPanel className="gw__panel" />

      <div className="gw__side">
        <div className="hidden items-center justify-end gap-2 px-10 pt-3 lg:flex">
          <LanguageSwitch />
          <ThemeToggle />
        </div>

        <div className="gw__stage">
          <section className="gateway-card gw__card relative overflow-hidden p-6 shadow-2 sm:px-8 sm:py-6">
            {/* A quiet constellation behind the content (static). */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full opacity-25"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="15%" cy="18%" r="1.5" fill="#ffffff" />
              <circle cx="85%" cy="28%" r="2" fill="#feae32" />
              <circle cx="45%" cy="13%" r="1.2" fill="#7ad09b" />
              <circle cx="72%" cy="74%" r="1.8" fill="#ffffff" />
              <circle cx="22%" cy="82%" r="1.5" fill="#feae32" />
              <line
                x1="15%"
                y1="18%"
                x2="45%"
                y2="13%"
                stroke="#b8c4ff"
                strokeDasharray="3 3"
                strokeWidth="0.5"
              />
              <line
                x1="45%"
                y1="13%"
                x2="85%"
                y2="28%"
                stroke="#b8c4ff"
                strokeDasharray="3 3"
                strokeWidth="0.5"
              />
            </svg>

            {/* Status chips: what is true right now */}
            <div
              className="gw-rise relative mb-5 flex flex-wrap items-center gap-2"
              style={rise(0)}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md">
                <span className="live-dot" style={{ '--live': '#9ef5be' } as CSSProperties} />
                <span className="text-label-caps font-semibold uppercase text-[#9ef5be]">
                  {t('engine')}
                </span>
                <span aria-hidden className="text-white/40">
                  •
                </span>
                <span className="font-serif text-citation-sm text-[#b8c4ff]">
                  {t('rules', { count: rulesCount })}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1 text-[#dde1ff]">
                <Icon name="shield_with_heart" className="text-sm" />
                <span className="text-label-caps uppercase">{t('demo')}</span>
              </span>
            </div>

            <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
              {/* The real mark on a white tile */}
              <div className="gw-pop relative mb-4">
                <span
                  aria-hidden
                  className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#feae32] via-[#dde1ff] to-[#82d8a3] opacity-70 blur-[3px]"
                />
                <span className="relative flex size-16 items-center justify-center rounded-xl bg-white p-1.5 shadow-2 sm:size-20">
                  <LogoMark className="size-[3.25rem] sm:size-[4.25rem]" />
                </span>
              </div>

              <p className="gw-rise flex items-baseline justify-center gap-2" style={rise(1)}>
                <span
                  lang="hi"
                  className="font-display text-[2.5rem] font-bold leading-none text-white"
                >
                  कवच
                </span>
                <span className="font-display text-[2.5rem] font-semibold leading-none text-[#dde1ff]">
                  Kavach
                </span>
              </p>
              <p
                className="gw-rise mt-2 text-label-caps font-semibold uppercase tracking-widest text-[#feae32]"
                style={rise(2)}
              >
                {t('eyebrow')}
              </p>

              <h2
                id="gw-title"
                className="gw-rise mb-2 mt-3 font-display text-[1.75rem] font-bold leading-tight text-white sm:text-headline-lg"
                style={rise(3)}
              >
                {t('title')}
                <br />
                {t('titleA')} <span className="text-[#feae32]">{t('titleEm')}</span>
              </h2>
              <p
                className="gw-rise mb-5 max-w-md text-body-md leading-relaxed text-[#b8c4ff]"
                style={rise(4)}
              >
                {t('lead')}
              </p>

              {/* Three checks, each lighting as the rail passes it */}
              <ul className="gw-rise mb-5 flex w-full flex-col gap-1.5 text-left" style={rise(5)}>
                {checks.map((c) => (
                  <li key={c.title} className={cn('gw__row', c.lit && 'is-in')}>
                    <span className="gw__check">
                      <Icon name={c.icon} className="text-sm" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-body-sm font-medium text-white">{c.title}</span>
                      <span className="hidden font-serif text-citation-sm text-[#b8c4ff] sm:block">
                        {c.sub}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* The rail */}
              <div className="gw-rise mb-5 w-full" style={rise(6)}>
                <div className="mb-1.5 flex items-center justify-between text-left">
                  <span className="flex items-center gap-1.5 text-label-caps uppercase text-[#b8c4ff]">
                    <Icon
                      name={done ? 'check_circle' : 'sync'}
                      className={cn('text-sm', !done && 'gw__spin')}
                    />
                    {t('progress')}
                  </span>
                  <span className="font-display text-numeral-md font-bold tabular-nums text-[#feae32]">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/15 p-0.5">
                  <div
                    className="h-full origin-left rounded-full bg-gradient-to-r from-[#b8c4ff] via-[#feae32] to-[#82d8a3]"
                    style={{ transform: `scaleX(${progress})` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 font-serif text-citation-sm text-[#b8c4ff]/85">
                  {checks.map((c) => (
                    <span key={c.tick} className="flex items-center gap-1">
                      <span
                        aria-hidden
                        className={cn(
                          'size-1.5 rounded-full transition-colors duration-300',
                          c.lit ? 'bg-[#9ef5be]' : 'bg-white/25',
                        )}
                      />
                      {c.tick}
                    </span>
                  ))}
                </div>
              </div>

              {/* The way in */}
              <div className="gw-rise mb-5 flex w-full flex-col gap-2" style={rise(7)}>
                <button
                  ref={enterRef}
                  type="button"
                  onClick={finish}
                  className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#feae32] font-display text-headline-sm font-bold text-[#2a1800] shadow-2 transition-[filter,transform] duration-200 hover:brightness-105 active:scale-[0.99]"
                >
                  {t('enter')}
                  <Icon
                    name="arrow_forward"
                    className="text-xl transition-transform duration-200 group-hover:translate-x-1"
                  />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/demo"
                    onClick={finish}
                    className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 font-display text-title-md text-[#dde1ff] transition-colors hover:bg-white/15"
                  >
                    <Icon name="family_history" className="text-lg text-[#feae32]" />
                    <span className="truncate">{t('demoBtn')}</span>
                  </Link>
                  <a
                    href="#promise"
                    onClick={finish}
                    className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2 font-display text-title-md text-[#dde1ff] transition-colors hover:bg-white/15"
                  >
                    <Icon name="policy" className="text-lg text-[#9ef5be]" />
                    <span className="truncate">{t('promise')}</span>
                  </a>
                </div>
              </div>

              <p
                className="gw-rise flex items-center justify-center gap-1 font-serif text-citation-sm text-[#b8c4ff]/75"
                style={rise(8)}
              >
                <Icon name="south" className="gw__bob text-sm" />
                {t('hint')}
              </p>
            </div>

            {/* A peek at the engine sandbox */}
            <div
              className="gw-rise relative mt-8 rounded-xl bg-white/5 p-4 backdrop-blur-md"
              style={rise(9)}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Icon name="offline_bolt" className="text-base text-[#9ef5be]" />
                  <span className="font-display text-title-md font-semibold text-white">
                    {t('sandbox')}
                  </span>
                </span>
                <span className="rounded-sm bg-[#102c88]/60 px-2 py-0.5 text-label-caps uppercase text-[#dde1ff]">
                  {t('sandboxChip')}
                </span>
              </div>
              <div className="relative aspect-[2/1] max-h-48 w-full overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element -- a static screenshot */}
                <img
                  src="/stitch/platform-preview.png"
                  alt={t('sandboxAlt')}
                  className="size-full object-cover object-top opacity-85"
                  draggable={false}
                />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-[#0f1b3d] via-transparent to-transparent p-2.5">
                  <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="font-serif text-citation-sm font-medium text-white">
                      {t('sandboxCaption')}
                    </span>
                    <span className="text-label-caps font-semibold uppercase text-[#9ef5be]">
                      {t('sandboxSaving', { saving: formatInr(saving) })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-4 flex flex-col gap-1 pt-2 font-serif text-citation-sm text-[#b8c4ff]">
              <p className="flex items-center gap-1.5">
                <Icon name="verified" className="text-xs" />
                {t('foot')}
              </p>
              <p>{t('foot2')}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
