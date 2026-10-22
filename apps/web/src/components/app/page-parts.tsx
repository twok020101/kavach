'use client';

import type { ReactNode } from 'react';
import { Icon } from '@/components/kavach/icon';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The parts every signed-in screen shares, so each one reads the same way: one page title size,
 * one intro measure, one way to say "couldn't load" and "nothing here yet".
 */

/** The page title: the same size on every app screen (home's greeting sets it). */
export const pageTitle =
  'font-display text-[1.75rem] font-bold leading-9 tracking-tight text-on-surface sm:text-headline-lg';

/** Upper-case small label over a title; Hindi keeps its case and spacing. */
export const capsLabel =
  'text-label-caps uppercase text-on-surface-variant [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal';

/** A section title inside a page (the home cards use the same). */
export const sectionTitle = 'font-display text-headline-sm text-on-surface';

/** The white card the dashboard is built from. */
export const appCard = 'rounded-lg border border-border bg-surface p-5 shadow-1 sm:p-6';

export function PageHeader({
  title,
  intro,
  back,
  aside,
  className,
}: {
  title: ReactNode;
  intro?: ReactNode;
  /** A way back, shown over the title. */
  back?: ReactNode;
  /** Something that sits beside the title on a laptop (a button, a chip). */
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'rise-in flex flex-col gap-4 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {back}
        <h1 className={pageTitle}>{title}</h1>
        {intro && <p className="max-w-[70ch] text-body-md text-on-surface-variant">{intro}</p>}
      </div>
      {aside && <div className="shrink-0 self-start md:self-auto">{aside}</div>}
    </header>
  );
}

/** A query that failed: what happened, and a way to try again. Never a blank screen. */
export function QueryError({
  message,
  retryLabel,
  onRetry,
  className,
}: {
  message: string;
  retryLabel: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-lg border border-gap/20 bg-gap-bg p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5',
        className,
      )}
    >
      <p className="flex items-start gap-2 text-body-md text-gap">
        <Icon name="cloud_off" className="mt-0.5 text-lg" />
        {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="shrink-0" onClick={onRetry}>
          <Icon name="refresh" className="text-lg" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

/** Nothing here yet: an icon tile, one line of what this place is for, and the way to start. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-low/60 px-5 py-10 text-center',
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-md bg-surface text-primary shadow-1">
        <Icon name={icon} className="text-2xl" />
      </span>
      <p className="max-w-[46ch] font-display text-title-md text-on-surface">{title}</p>
      {body && <p className="max-w-[56ch] text-body-sm text-on-surface-variant">{body}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Stand-in rows while a list loads. */
export function ListSkeleton({
  rows = 3,
  className,
  rowClassName = 'h-20',
  label,
}: {
  rows?: number;
  className?: string;
  rowClassName?: string;
  label?: string;
}) {
  return (
    <div aria-busy aria-label={label} className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn('rounded-lg', rowClassName)} />
      ))}
    </div>
  );
}
