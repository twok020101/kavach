'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type TextScale = 'normal' | 'large' | 'xlarge';
export const TEXT_SCALES: TextScale[] = ['normal', 'large', 'xlarge'];

// Keep in step with public/theme.js, which applies these before the first paint.
const THEME_KEY = 'kavach.theme';
const SCALE_KEY = 'kavach.textScale';

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
    if (scale === 'normal') delete document.documentElement.dataset.textScale;
    else document.documentElement.dataset.textScale = scale;
    listeners.forEach((fn) => fn());
  }, []);
  return { theme, setTheme, textScale, setTextScale };
}

/** Whether the page is showing dark right now (for the quick toggle). */
export const isDark = () => document.documentElement.dataset.theme === 'dark';
