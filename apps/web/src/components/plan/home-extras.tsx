'use client';

import type { Household, Member, Policy } from '@kavach/schemas';
import {
  ArrowRight,
  CalendarClock,
  FileWarning,
  GitBranch,
  type LucideIcon,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { useMoney } from '@/lib/country';
import { daysBetween, useDate } from './format';
import type { Pin } from './date-scrubber';

/**
 * The parts of the owner's Home that make it read like someone who knows the family is keeping
 * watch: a greeting for the time of day, what needs the owner, the next dates, three plain
 * things to do, and what Kavach will say first if someone is admitted tonight.
 */

const HEALTH: Policy['kind'][] = [
  'group_health',
  'retail_health',
  'super_top_up',
  'medishield_life',
  'integrated_shield',
];

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
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {t(`greeting.${slot}`, { name })}
      </h1>
      <p className="mt-1 text-muted">
        {t('watch', { policies: inForce.length, people: household.members.length })}{' '}
        <span className={cn(needs > 0 ? 'font-semibold text-partial' : 'text-safe')}>
          {t('needsYou', { count: needs })}
        </span>
      </p>
    </div>
  );
}

/** Three plain things to do, as large targets. */
export function QuickActions({ household }: { household: Household }) {
  const t = useTranslations('plan.home.quick');
  const tc = useTranslations('common');
  // The person who most needs her own login: the parent who will be at the desk rather than in
  // the bed (the younger parent who does not speak English, Kamala in the sample family), else any parent.
  const parents = household.members.filter((m) => m.relation === 'parent');
  const invitee =
    [...parents].filter((m) => m.language !== 'en').sort((a, b) => a.age - b.age)[0] ?? parents[0];
  const items: {
    href: '/change' | '/claims' | '/settings/access';
    icon: LucideIcon;
    label: string;
    hint: string;
  }[] = [
    { href: '/change', icon: GitBranch, label: t('change'), hint: t('changeHint') },
    { href: '/claims', icon: FileWarning, label: t('claim'), hint: t('claimHint') },
  ];
  if (invitee) {
    items.push({
      href: '/settings/access',
      icon: UserPlus,
      label: t('invite', { name: invitee.name.split(' ')[0] ?? invitee.name }),
      hint: t('inviteHint', { language: tc(`languages.${invitee?.language ?? 'en'}`) }),
    });
  }
  return (
    <section aria-label={t('title')}>
      <ul className="grid gap-3 sm:grid-cols-3 lg:gap-4">
        {items.map(({ href, icon: Icon, label, hint }) => (
          <li key={href}>
            <Link
              href={href}
              className="press flex h-full min-h-20 items-start gap-3 rounded-md border border-border bg-surface p-4 shadow-1 hover:border-primary"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display font-semibold leading-snug">{label}</span>
                <span className="text-sm text-muted">{hint}</span>
              </span>
              <ArrowRight aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />
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
    <Card as="section" aria-labelledby="coming-up" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="coming-up" className="flex items-center gap-2 font-display text-lg font-bold">
          <CalendarClock aria-hidden className="size-5 text-primary" />
          {t('title')}
        </h2>
        <Link
          href="/timeline"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t('all')}
        </Link>
      </div>
      {next.length === 0 ? (
        <p className="text-muted">{t('none')}</p>
      ) : (
        <ol className="hairline">
          {next.map((p) => {
            const days = daysBetween(from, p.date);
            return (
              <li key={p.date + p.label} className="flex items-baseline justify-between gap-3 py-2">
                <span className="flex flex-col">
                  <span className="font-semibold">{p.label}</span>
                  <span className="text-sm text-muted">{date(p.date, true)}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-sm px-2 py-0.5 text-sm font-semibold',
                    days <= 30 ? 'bg-partial-bg text-partial' : 'bg-sunken text-muted',
                  )}
                >
                  {t('inDays', { days })}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

/** What a policy is called at home: company policy, parents' policy, top-up, own. */
function nick(p: Policy, household: Household, t: (k: string) => string) {
  const covered = household.members.filter((m) => p.coveredMemberIds.includes(m.id));
  const parentsOnly =
    covered.length > 0 &&
    covered.every((m) => m.relation === 'parent' || m.relation === 'parent_in_law');
  if (p.kind === 'super_top_up') return t('nick.topup');
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
    <Card as="section" aria-labelledby="ready-title" className="flex flex-col gap-3">
      <h2 id="ready-title" className="flex items-center gap-2 font-display text-lg font-bold">
        <ShieldCheck aria-hidden className="size-5 text-safe" />
        {t('title')}
      </h2>
      <p className="text-sm text-muted">{t('intro')}</p>
      <ul className="hairline">
        {people.map((m) => {
          const covering = household.policies.filter(
            (p) =>
              HEALTH.includes(p.kind) &&
              p.coveredMemberIds.includes(m.id) &&
              p.startDate <= asOf &&
              p.endDate >= asOf &&
              p.kind !== 'super_top_up',
          );
          const first = covering.find((p) => p.source === 'employer') ?? covering[0];
          const limit = first?.terms.roomRentLimitPerDay;
          return (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <MemberAvatar member={m} className="size-9 text-sm" />
              <span className="min-w-0 flex-1 text-base">
                {first
                  ? t('line', {
                      name: m.name.split(' ')[0] ?? m.name,
                      policy: nick(first, household, t),
                      limit: limit ? money(limit) : 'none',
                    })
                  : t('none', { name: m.name.split(' ')[0] ?? m.name })}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
