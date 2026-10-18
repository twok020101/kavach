'use client';

import type { Household, TimelineEntry, TimelineKind } from '@kavach/schemas';
import {
  BellRing,
  CalendarClock,
  ChevronRight,
  FileText,
  GitBranch,
  Hospital,
  type LucideIcon,
  PenLine,
  Receipt,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Reveal } from '@/components/kavach/reveal';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useDate, dateTag } from '@/components/plan/format';
import { Chip } from '@/components/setup/member-sheet';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { useTimeline } from '@/lib/setup';

const FILTERS: Record<string, TimelineKind[] | null> = {
  all: null,
  changes: ['life_change', 'action', 'cover_starts', 'cover_ends', 'setup', 'consent'],
  documents: ['document_added'],
  hospital: ['desk_session', 'notification'],
  claims: ['claim_case'],
};
type Filter = 'all' | 'changes' | 'documents' | 'hospital' | 'claims';

const ICONS: Record<TimelineKind, LucideIcon> = {
  setup: Users,
  consent: ShieldCheck,
  document_added: FileText,
  life_change: GitBranch,
  action: PenLine,
  desk_session: Hospital,
  claim_case: Receipt,
  notification: BellRing,
  cover_starts: CalendarClock,
  cover_ends: CalendarClock,
};

export function TimelineScreen() {
  return <PlanFrame>{(household) => <TimelineView household={household} />}</PlanFrame>;
}

function TimelineView({ household }: { household: Household }) {
  const t = useTranslations('settings.timeline');
  const locale = useLocale();
  const { data } = useTimeline(household.id);
  const [filter, setFilter] = useState<Filter>('all');

  const kinds = FILTERS[filter];
  const entries = data?.entries.filter((e) => !kinds || kinds.includes(e.kind)) ?? [];
  const upcoming = entries.filter((e) => e.upcoming);
  const past = entries.filter((e) => !e.upcoming);
  const month = new Intl.DateTimeFormat(dateTag(locale), {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const byMonth = new Map<string, TimelineEntry[]>();
  for (const e of past) {
    const key = month.format(new Date(e.at));
    byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted">{t('intro')}</p>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Chip key={f} selected={filter === f} onClick={() => setFilter(f)} className="shrink-0">
            {t(`filters.${f}`)}
          </Chip>
        ))}
      </div>

      {!data && (
        <div className="flex flex-col gap-3" aria-busy>
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}
      {data && entries.length === 0 && (
        <p className="rounded-md bg-sunken p-6 text-center text-muted">{t('empty')}</p>
      )}

      {/* The line runs down the left; each entry's icon sits on it. */}
      <div className="relative flex flex-col gap-6 pl-2">
        <span
          aria-hidden
          className="absolute bottom-2 left-[1.45rem] top-2 w-0.5 rounded-sm bg-border"
        />

        {upcoming.length > 0 && (
          <Group label={t('ahead')} tone="partial">
            {upcoming.map((e, i) => (
              <Entry key={e.id} entry={e} delay={i * 0.04} />
            ))}
          </Group>
        )}

        {data && (upcoming.length > 0 || past.length > 0) && (
          <div className="relative z-10 flex items-center gap-3" role="separator">
            <span className="ml-1.5 flex size-8 items-center justify-center rounded-md bg-primary text-on-primary">
              <span className="size-2.5 rounded-full bg-on-primary" />
            </span>
            <span className="rounded-sm bg-primary px-3 py-0.5 text-sm font-semibold text-on-primary">
              {t('today')}
            </span>
            <span className="h-px flex-1 bg-primary/40" />
          </div>
        )}

        {[...byMonth].map(([label, items]) => (
          <Group key={label} label={label}>
            {items.map((e, i) => (
              <Entry key={e.id} entry={e} delay={i * 0.04} />
            ))}
          </Group>
        ))}
      </div>
    </div>
  );
}

function Group({
  label,
  tone = 'muted',
  children,
}: {
  label: string;
  tone?: 'muted' | 'partial';
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2
        className={cn(
          'relative z-10 ml-14 text-xs font-semibold uppercase tracking-wide',
          tone === 'partial' ? 'text-partial' : 'text-muted',
        )}
      >
        {label}
      </h2>
      <ol className="flex flex-col gap-3">{children}</ol>
    </section>
  );
}

function Entry({ entry, delay }: { entry: TimelineEntry; delay: number }) {
  const t = useTranslations('settings.timeline');
  const date = useDate();
  const Icon = ICONS[entry.kind];
  const p = entry.params;

  const title =
    entry.kind === 'desk_session' && p.hospital
      ? t('entry.desk_session_at', p)
      : entry.kind === 'life_change' || entry.kind === 'action'
        ? (entry.text ?? t(`entry.${entry.kind}`))
        : t(`entry.${entry.kind}`, p);
  const detail =
    entry.kind === 'notification' && p.channel
      ? t(`channel.${p.channel as 'in_app'}`)
      : entry.kind === 'action' && p.status
        ? t(`actionStatus.${p.status as 'draft'}`)
        : entry.kind === 'life_change' && p.effectiveDate
          ? t('effective', { date: date(p.effectiveDate, true) })
          : undefined;

  const body = (
    <>
      <span
        className={cn(
          'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-md',
          entry.upcoming ? 'bg-partial-bg text-partial' : 'bg-primary-soft text-primary',
        )}
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <span
        className={cn(
          'flex min-w-0 flex-1 items-center gap-3 rounded-md border border-border bg-surface p-3',
          entry.href && 'press hover:border-primary',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{title}</span>
          {entry.kind === 'notification' && entry.text && (
            <span className="line-clamp-2 text-sm">{entry.text}</span>
          )}
          <span className="text-sm text-muted">
            {date(entry.at.slice(0, 10), true)} · {t(`by.${entry.by}`)}
            {detail && ` · ${detail}`}
          </span>
        </span>
        {entry.href && <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />}
      </span>
    </>
  );

  return (
    <Reveal as="li" delay={delay}>
      {entry.href ? (
        <Link href={entry.href} className="flex items-center gap-3">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3">{body}</div>
      )}
    </Reveal>
  );
}
