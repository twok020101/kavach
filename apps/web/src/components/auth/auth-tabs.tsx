'use client';

import { type CSSProperties, type KeyboardEvent, useRef } from 'react';
import { cn } from '../ui/cn';

export type AuthTab<T extends string> = { id: T; label: string };

const tabId = (base: string, id: string) => `${base}-tab-${id}`;
const panelId = (base: string, id: string) => `${base}-panel-${id}`;

/** Props for the panel of one tab: its id, its label, and hidden unless chosen. */
export function tabPanelProps(base: string, id: string, value: string) {
  return {
    id: panelId(base, id),
    role: 'tabpanel' as const,
    'aria-labelledby': tabId(base, id),
    hidden: id !== value,
  };
}

/** Moves focus to a tab (e.g. after a "Use Quick access" button switches back to it). */
export function focusTab(base: string, id: string) {
  requestAnimationFrame(() => document.getElementById(tabId(base, id))?.focus());
}

/**
 * The Stitch segmented control as real tabs (WAI-ARIA tabs pattern): a tinted track with a white
 * pill that slides under the chosen tab. Arrow keys move between tabs and choose them, Home and
 * End jump to the ends; only the chosen tab is in the Tab order. Every tab is 48 px tall.
 */
export function AuthTabs<T extends string>({
  base,
  label,
  tabs,
  value,
  onChange,
}: {
  /** Prefix for the tab and panel ids. */
  base: string;
  label: string;
  tabs: AuthTab<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    tabs.findIndex((tab) => tab.id === value),
  );

  const move = (to: number) => {
    const n = (to + tabs.length) % tabs.length;
    const tab = tabs[n];
    if (!tab) return;
    onChange(tab.id);
    refs.current[n]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const to = keys[e.key];
    if (to !== undefined) {
      e.preventDefault();
      move(to);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative grid rounded-lg bg-surface-container-low p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {/* The white pill under the chosen tab (decorative; the tab itself carries the state). */}
      <span
        aria-hidden
        className="auth-tabs__pill absolute inset-y-1 left-1 rounded-md bg-surface shadow-1"
        style={
          {
            width: `calc((100% - 0.5rem) / ${tabs.length})`,
            transform: `translateX(${index * 100}%)`,
          } as CSSProperties
        }
      />
      {tabs.map((tab, i) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(base, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(base, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative z-[1] flex min-h-12 items-center justify-center rounded-md px-2 text-center font-display transition-colors duration-150',
              selected
                ? 'font-bold text-primary'
                : 'font-semibold text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span className="text-[0.9375rem] leading-5 sm:text-title-md">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
