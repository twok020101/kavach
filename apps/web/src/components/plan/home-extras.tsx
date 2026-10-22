'use client';

import type { Household, Member, Policy } from '@kavach/schemas';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { useCountOnce } from '@/components/app/use-count-once';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { useMoney } from '@/lib/country';
import { daysBetween, useDate } from './format';
import type { Pin } from './date-scrubber';
import { ScoreRing } from './score-ring';

/**
 * The parts of the owner's Home that make it read like someone who knows the family is keeping
 * watch (Stitch dashboard): a greeting for the time of day, the safety score, the next step,
 * the next dates, what Kavach will say first if someone is admitted tonight, three things to do.
 */

const HEALTH: Policy['kind'][] = [
  'group_health',
  'retail_health',
  'super_top_up',
  'medishield_life',
  'integrated_shield',
];

/** The white card the dashboard is built from: 16 px corners, hairline, resting shadow. */
export const homeCard = 'rounded-lg border border-border bg-surface p-5 shadow-1 sm:p-6';

const b = (chunks: ReactNode) => (
  <strong className="font-semibold text-on-surface">{chunks}</strong>
);

/** "Good evening, Rahul" by the device clock; plus one line on what Kavach is watching. */
export function Greeting({
  household,
  needs,
  asOf,
}: {
  household: Household;
  /** Letters and reminders waiting for the owner. */
  needs: number;
  asOf: string;
}) {
  const t = useTranslations('plan.home');
  const owner = household.members.find((m) => m.relation === 'self');
  const name = owner?.name.split(' ')[0] ?? household.name;
  const hour = new Date().getHours();
  const slot = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const inForce = household.policies.filter((p) => p.startDate <= asOf && p.endDate >= asOf);
  return (
    <div className="min-w-0">
      <h1 className="font-display text-[1.75rem] font-bold leading-9 tracking-tight text-on-surface sm:text-headline-lg">
        {t(`greeting.${slot}`, { name })}
      </h1>
      <p className="mt-1 text-body-md text-on-surface-variant">
        {t.rich('watch', { policies: inForce.length, people: household.members.length, b })}{' '}
        <span
          className={cn(
            'inline-flex items-center gap-1 font-medium',
            needs > 0 ? 'text-partial' : 'text-safe',
          )}
        >
          <Icon name={needs > 0 ? 'pending_actions' : 'check_circle'} className="text-base" />
          {t('needsYou', { count: needs })}
        </span>
      </p>
    </div>
  );
}

/** Safety score: the ring, what it means, and the covered / partly / gaps counts. */
export function ScoreCard({
  score,
  covered,
  partial,
  gaps,
  onJob,
  earner,
}: {
  score: number;
  covered: number;
  partial: number;
  gaps: number;
  onJob: number;
  earner: string;
}) {
  const t = useTranslations('plan.home');
  const word = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  return (
    <section aria-label={t('score')} className={cn(homeCard, 'flex flex-col gap-4')}>
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />
        <div className="flex min-w-0 flex-col">
          <span className="text-label-caps uppercase text-on-surface-variant [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal">
            {t('score')}
          </span>
          <span className="font-display text-headline-sm leading-snug text-on-surface">
            {t(`scoreWord.${word}`)}
          </span>
          <span className="mt-0.5 font-serif text-citation-sm text-on-surface-variant">
            <span className={cn('font-semibold', gaps > 0 ? 'text-gap' : 'text-safe')}>
              {t('summaryGaps', { gaps })}
            </span>
            {' · '}
            {t('summaryJob', { onJob, name: earner })}
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <Stat icon="verified" tone="safe" n={covered} label={t('stats.covered')} />
        <Stat icon="shield" tone="partial" n={partial} label={t('stats.partial')} />
        <Stat icon="crisis_alert" tone="gap" n={gaps} label={t('stats.gaps')} />
      </dl>
    </section>
  );
}

function Stat({
  icon,
  tone,
  n,
  label,
}: {
  icon: string;
  tone: 'safe' | 'partial' | 'gap';
  n: number;
  label: string;
}) {
  const tones = {
    safe: 'border-safe/20 bg-safe-bg text-safe',
    partial: 'border-partial/20 bg-partial-bg text-partial',
    gap: 'border-gap/20 bg-gap-bg text-gap',
  };
  const shown = useCountOnce(n, 700);
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-md border px-1.5 py-2.5',
        tones[tone],
      )}
    >
      <dt className="flex min-w-0 flex-wrap items-center justify-center gap-1 text-center text-label-caps uppercase [overflow-wrap:anywhere] [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal">
        <Icon name={icon} className="text-sm" />
        {label}
      </dt>
      <dd className="text-numeral-md font-bold tabular-nums">
        <span className="sr-only">{n}</span>
        <span aria-hidden>{shown}</span>
      </dd>
    </div>
  );
}

/** The next thing to do: steps waiting for the owner, else the plan's next steps and cost. */
export function NextCard({
  drafts,
  steps,
  monthly,
}: {
  drafts: number;
  steps: number;
  monthly: number;
}) {
  const t = useTranslations('plan.home');
  if (drafts === 0 && steps === 0) return null;
  const waiting = drafts > 0;
  return (
    <Link
      href={waiting ? '/actions' : '/plan'}
      className={cn(
        'group lift press flex items-center gap-4 rounded-lg border p-4 shadow-1 sm:p-5',
        waiting
          ? 'border-partial/30 bg-partial-bg hover:border-partial'
          : 'border-border bg-surface hover:border-primary/50',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-md transition-colors',
          waiting
            ? 'bg-surface text-partial'
            : 'bg-surface-container-low text-primary group-hover:bg-primary group-hover:text-on-primary',
        )}
      >
        <Icon name={waiting ? 'edit_note' : 'arrow_forward'} className="text-[22px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-title-md text-on-surface">
          {waiting
            ? t('drafts', { count: drafts })
            : t.rich('next', {
                count: steps,
                amount: () => <Amount value={monthly} />,
              })}
        </span>
        <span className="text-body-sm text-on-surface-variant">
          {waiting ? t('draftsHint') : t('nextHint')}
        </span>
      </span>
    </Link>
  );
}

/** Three plain things to do, as cards with an icon tile and an arrow. */
export function QuickActions({
  household,
  className,
}: {
  household: Household;
  className?: string;
}) {
  const t = useTranslations('plan.home.quick');
  const tc = useTranslations('common');
  // The person who most needs her own login: the parent who will be at the desk rather than in
  // the bed (the younger Hindi-speaking parent, Kamala in the sample family), else any parent.
  const parents = household.members.filter((m) => m.relation === 'parent');
  const invitee =
    [...parents].filter((m) => m.language !== 'en').sort((a, b) => a.age - b.age)[0] ?? parents[0];
  const items: {
    href: '/change' | '/claims' | '/settings/access';
    icon: string;
    label: string;
    hint: string;
  }[] = [
    { href: '/change', icon: 'alt_route', label: t('change'), hint: t('changeHint') },
    { href: '/claims', icon: 'assignment_turned_in', label: t('claim'), hint: t('claimHint') },
  ];
  if (invitee) {
    items.push({
      href: '/settings/access',
      icon: 'person_add',
      label: t('invite', { name: invitee.name.split(' ')[0] ?? invitee.name }),
      hint: t('inviteHint', { language: tc(`languages.${invitee?.language ?? 'en'}`) }),
    });
  }
  return (
    <section aria-label={t('title')} className={className}>
      <ul className="stagger grid gap-3 sm:grid-cols-3 sm:gap-4">
        {items.map(({ href, icon, label, hint }, i) => (
          <li key={href} style={{ '--i': i + 4 } as CSSProperties}>
            <Link
              href={href}
              className="group lift press flex h-full min-h-20 items-start justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-1 hover:border-primary/50"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-container-high text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                  <Icon name={icon} className="text-xl" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-title-md leading-snug text-on-surface">
                    {label}
                  </span>
                  <span className="mt-0.5 text-body-sm text-on-surface-variant">{hint}</span>
                </span>
              </span>
              <Icon
                name="arrow_forward"
                className="nudge mt-1 text-xl text-on-surface-variant group-hover:text-primary"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The next dates that change the family's cover, with how far away each is. */
export function ComingUp({ pins, from }: { pins: Pin[]; from: string }) {
  const t = useTranslations('plan.home.comingUp');
  const date = useDate();
  const next = [...pins]
    .filter((p) => p.date >= from)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  return (
    <section aria-labelledby="coming-up" className={cn(homeCard, 'flex flex-col gap-3')}>
      <div className="flex items-center justify-between gap-3">
        <h2
          id="coming-up"
          className="flex items-center gap-2 font-display text-headline-sm text-on-surface"
        >
          <Icon name="calendar_clock" className="text-xl text-primary" />
          {t('title')}
        </h2>
        <Link
          href="/timeline"
          className="-mr-2 flex min-h-12 items-center rounded-md px-2 text-body-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('all')}
        </Link>
      </div>
      {next.length === 0 ? (
        <p className="text-body-md text-on-surface-variant">{t('none')}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {next.map((p) => {
            const days = daysBetween(from, p.date);
            return (
              <li
                key={p.date + p.label}
                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-display text-title-md leading-tight text-on-surface">
                    {p.label}
                  </span>
                  <span className="mt-0.5 font-serif text-citation-sm text-on-surface-variant">
                    {date(p.date, true)}
                  </span>
                </span>
                <span
                  className={clsx(
                    'shrink-0 whitespace-nowrap rounded-sm px-2.5 py-1 text-label-caps',
                    days <= 30
                      ? 'bg-partial-bg text-partial'
                      : 'bg-surface-container-low text-on-surface-variant',
                  )}
                >
                  {t('inDays', { days })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** What a policy is called at home: company policy, parents' policy, top-up, own. */
function nick(p: Policy, household: Household, t: (k: string) => string) {
  const covered = household.members.filter((m) => p.coveredMemberIds.includes(m.id));
  const parentsOnly =
    covered.length > 0 &&
    covered.every((m) => m.relation === 'parent' || m.relation === 'parent_in_law');
  if (p.kind === 'super_top_up') return t('nick.topup');
  // Singapore cover goes by its own name at the desk, whoever it covers.
  if (p.kind === 'integrated_shield') return t('nick.shield');
  if (p.kind === 'medishield_life') return t('nick.medishield');
  if (parentsOnly) return t('nick.parents');
  if (p.source === 'employer') return t('nick.company');
  return t('nick.own');
}

/**
 * For each parent (and the owner): the card Kavach will ask for first tonight and the room
 * limit on it. The same facts the desk uses, shown before anyone is in a hurry.
 */
export function ReadyPanel({ household, asOf }: { household: Household; asOf: string }) {
  const t = useTranslations('plan.home.ready');
  const money = useMoney();
  const people: Member[] = [
    ...household.members.filter((m) => m.relation === 'parent' || m.relation === 'parent_in_law'),
    ...household.members.filter((m) => m.relation === 'self'),
  ];
  return (
    <section aria-labelledby="ready-title" className={cn(homeCard, 'flex flex-col gap-3')}>
      <h2
        id="ready-title"
        className="flex items-center gap-2 font-display text-headline-sm text-on-surface"
      >
        <Icon name="emergency" className="text-xl text-safe" />
        {t('title')}
      </h2>
      <p className="-mt-1 text-body-sm text-on-surface-variant">{t('intro')}</p>
      <ul className="flex flex-col gap-2">
        {people.map((m) => {
          const covering = household.policies.filter(
            (p) =>
              HEALTH.includes(p.kind) &&
              p.coveredMemberIds.includes(m.id) &&
              p.startDate <= asOf &&
              p.endDate >= asOf &&
              p.kind !== 'super_top_up',
          );
          // In Singapore the Shield plan card goes first (MediShield Life is part of it), as the
          // desk engine orders them; in India the employer's policy does.
          const first =
            covering.find((p) => p.kind === 'integrated_shield') ??
            covering.find((p) => p.source === 'employer') ??
            covering[0];
          const limit = first?.terms.roomRentLimitPerDay;
          const name = m.name.split(' ')[0] ?? m.name;
          return (
            <li
              key={m.id}
              className="flex items-start gap-2.5 rounded-md border border-outline-variant/25 bg-surface-container-low/70 p-2.5"
            >
              <MemberAvatar member={m} className="mt-0.5 size-7 text-xs" />
              <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                {first ? (
                  <>
                    {t.rich('line', { name, policy: nick(first, household, t), b })}
                    {limit ? (
                      <span className="text-on-surface-variant">
                        {' · '}
                        {t('limit', { limit: money(limit) })}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-gap">{t('none', { name })}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
