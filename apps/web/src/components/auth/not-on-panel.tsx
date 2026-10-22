'use client';

import type { ReactNode } from 'react';
import { Icon } from '../kavach/icon';

/**
 * A sign-in method that is designed but not switched on in the prototype (mobile OTP, ABHA):
 * its title with a "Not switched on" pill, its field and button shown disabled (never a fake
 * flow), a plain note saying so, and one way back to the method that works.
 */
export function NotOnPanel({
  title,
  badge,
  field,
  action,
  note,
  backLabel,
  onBack,
}: {
  title: string;
  badge: string;
  /** The disabled input(s); give them aria-describedby={`${noteId}`}. */
  field: ReactNode;
  /** The disabled main button's label. */
  action: string;
  note: { id: string; text: string };
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-title-md text-on-surface">{title}</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary-fixed px-2.5 py-0.5 text-label-caps uppercase text-secondary">
          <Icon name="toggle_off" className="text-base" />
          {badge}
        </span>
      </div>
      {field}
      <button
        type="button"
        disabled
        aria-describedby={note.id}
        className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-surface-container text-on-surface-variant"
      >
        <span className="font-display text-title-md">{action}</span>
      </button>
      <p
        id={note.id}
        className="flex items-start gap-2 rounded-md bg-secondary-fixed/45 px-4 py-3 text-body-md text-on-surface"
      >
        <Icon name="info" className="mt-0.5 text-lg text-secondary" />
        <span>{note.text}</span>
      </p>
      <button
        type="button"
        onClick={onBack}
        className="press inline-flex min-h-12 items-center gap-2 self-start rounded-lg bg-primary-soft px-4 font-semibold text-primary hover:bg-primary/15"
      >
        <Icon name="bolt" className="text-xl" />
        {backLabel}
      </button>
    </div>
  );
}

/** A disabled text field in the Stitch style, with an optional prefix such as +91. */
export function DisabledField({
  id,
  label,
  hint,
  prefix,
  placeholder,
  describedBy,
  inputMode,
}: {
  id: string;
  label: string;
  hint?: string;
  prefix?: string;
  placeholder?: string;
  describedBy: string;
  inputMode?: 'tel' | 'numeric';
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-md font-medium text-on-surface">
        {label}
      </label>
      <div className="flex min-h-12 items-stretch overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low opacity-80">
        {prefix && (
          <span className="flex items-center border-r border-outline-variant px-3 font-mono text-on-surface-variant">
            {prefix}
          </span>
        )}
        <input
          id={id}
          disabled
          inputMode={inputMode}
          placeholder={placeholder}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 cursor-not-allowed bg-transparent px-3 font-mono text-on-surface placeholder:text-on-surface-variant/70"
        />
      </div>
      {hint && <p className="text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}
