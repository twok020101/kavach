'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type TextScale = 'normal' | 'large';

const THEME_KEY = 'kavach.theme';
const SCALE_KEY = 'kavach.textScale';

/**
 * Runs in <head> before the first paint, so the page never flashes the wrong theme.
 * Kept as a string because it must work before React loads.
 */
export const themeScript = `try{var t=localStorage.getItem('${THEME_KEY}');var m=window.matchMedia('(prefers-color-scheme: dark)');var d=t==='dark'||(t!=='light'&&m.matches);var e=document.documentElement;if(d)e.dataset.theme='dark';if(localStorage.getItem('${SCALE_KEY}')==='large')e.dataset.textScale='large'}catch(_){}`;

const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Applies for this visit only.
  }
}

export function applyTheme(pref: ThemePref) {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
}

/** Theme (system, light or dark) and text size (S27). Saved on this device. */
export function useAppearance() {
  const theme = useSyncExternalStore(
    subscribe,
    () => read<ThemePref>(THEME_KEY, 'system'),
    () => 'system' as ThemePref,
  );
  const textScale = useSyncExternalStore(
    subscribe,
    () => read<TextScale>(SCALE_KEY, 'normal'),
    () => 'normal' as TextScale,
  );
  const setTheme = useCallback((pref: ThemePref) => {
    write(THEME_KEY, pref);
    applyTheme(pref);
    listeners.forEach((fn) => fn());
  }, []);
  const setTextScale = useCallback((scale: TextScale) => {
    write(SCALE_KEY, scale);
    if (scale === 'large') document.documentElement.dataset.textScale = 'large';
    else delete document.documentElement.dataset.textScale;
    listeners.forEach((fn) => fn());
  }, []);
  return { theme, setTheme, textScale, setTextScale };
}

/** Whether the page is showing dark right now (for the quick toggle). */
export const isDark = () => document.documentElement.dataset.theme === 'dark';
