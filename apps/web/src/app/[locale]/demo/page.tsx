'use client';

import { formatMoney } from '@kavach/engine';
import { DemoCheckpoint, type Household, type Policy } from '@kavach/schemas';
import { useFormatter, useTranslations } from 'next-intl';
import { Icon } from '@/components/kavach/icon';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemoControls, useHousehold } from '@/lib/household';

/**
 * The moments each sample family's story has (data/personas/*.json `checkpoints`): the Tans in
 * Singapore have only set-up and the hospital stay, so only those are offered for them.
 */
const CHECKPOINTS: Record<Household['country'], readonly DemoCheckpoint[]> = {
  IN: DemoCheckpoint.options,
  SG: ['setup', 'hospital'],
};

/** Dev page: starts the demo and shows the household, with the S29 checkpoint controls. */
export default function DemoPage() {
  const t = useTranslations('household');
  const { data: household, error, refetch, isFetching } = useHousehold();

  if (error) {
    return (
      <DemoShell>
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg bg-gap-bg p-4 text-gap sm:p-5"
        >
          <p className="flex items-start gap-2 text-body-md">
            <Icon name="error" className="mt-0.5 text-lg" />
            {t('error')}
          </p>
          <Button variant="secondary" loading={isFetching} onClick={() => refetch()}>
            <Icon name="refresh" className="text-xl" />
            {t('retry')}
          </Button>
        </div>
      </DemoShell>
    );
  }
  if (!household) {
    return (
      <DemoShell>
        <p role="status" className="sr-only">
          {t('loading')}
        </p>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-6 w-full max-w-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-24 rounded-full" />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </DemoShell>
    );
  }
  return <DemoHousehold household={household} />;
}

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      id="main"
      className="auth-card mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14"
    >
      {children}
    </main>
  );
}

function DemoHousehold({ household }: { household: Household }) {
  const t = useTranslations('household');
  const tc = useTranslations('common');
  const format = useFormatter();
  const { reset } = useDemoControls(household.id);
  const sg = household.country === 'SG';
  const money = (amount: number) => formatMoney(amount, household.country);
  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });
  const kind = (k: Policy['kind']) => (t.has(`kinds.${k}`) ? t(`kinds.${k}`) : k);

  return (
    <DemoShell>
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-[1.75rem] font-bold leading-9 tracking-[-0.015em] text-on-surface sm:text-headline-lg">
          {t('title')}
        </h1>
        <p className="max-w-[60ch] text-body-lg text-on-surface-variant">
          {t(sg ? 'introSg' : 'intro')}
        </p>
        {household.asOf && (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary-fixed px-3 py-1 text-label-caps uppercase text-secondary">
            <Icon name="event" className="text-sm" />
            {t('demoDate', { date: date(household.asOf) })}
          </span>
        )}
      </header>

      <section aria-labelledby="demo-moments" className="flex flex-col gap-3">
        <h2 id="demo-moments" className="font-display text-headline-sm text-on-surface">
          {t('checkpointsHeading')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {CHECKPOINTS[household.country].map((checkpoint) => (
            <button
              key={checkpoint}
              type="button"
              disabled={reset.isPending}
              onClick={() => reset.mutate(checkpoint)}
              className="press inline-flex min-h-12 items-center rounded-full bg-surface px-4 font-medium text-on-surface ring-1 ring-border hover:bg-primary-soft hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              {t(`checkpoints.${checkpoint}`)}
            </button>
          ))}
        </div>
        {reset.isError && (
          <p role="alert" className="flex items-start gap-2 text-body-md text-gap">
            <Icon name="error" className="mt-0.5 text-lg" />
            {t('error')}
          </p>
        )}
      </section>

      <section aria-labelledby="demo-members" className="flex flex-col gap-3">
        <h2 id="demo-members" className="font-display text-headline-sm text-on-surface">
          {t('membersHeading')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {household.members.map((member) => (
            <li
              key={member.id}
              className="flex flex-col gap-2 rounded-lg bg-surface p-4 shadow-1 ring-1 ring-border/60"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="font-display text-title-md text-on-surface">{member.name}</span>
                <span className="text-body-sm text-on-surface-variant">
                  {t(`relations.${member.relation}`)} · {t('age', { age: member.age })}
                </span>
              </div>
              <Tags
                items={[
                  member.language !== 'en' &&
                    t('speaks', { language: tc(`languages.${member.language}`) }),
                  ...member.conditions.map((c) =>
                    t.has(`conditions.${c}`) ? t(`conditions.${c}`) : c,
                  ),
                ]}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="demo-policies" className="flex flex-col gap-3">
        <h2 id="demo-policies" className="font-display text-headline-sm text-on-surface">
          {t('policiesHeading')}
        </h2>
        <ul className="flex flex-col gap-3">
          {household.policies.map((policy) => (
            <li
              key={policy.id}
              className="flex flex-col gap-1.5 rounded-lg bg-surface p-4 shadow-1 ring-1 ring-border/60 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <span className="font-display text-title-md text-on-surface">
                  {policy.productName}
                </span>
                <span className="text-label-caps uppercase text-primary">{kind(policy.kind)}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {policy.insurer} · {t('validTill', { date: date(policy.endDate) })}
              </p>
              <p className="amount text-body-md text-on-surface">
                {t('sumInsured', { amount: money(policy.sumInsured) })} ·{' '}
                {t('covers', { names: memberNames(household, policy) })}
              </p>
              <Tags items={policyTerms(policy, t, money)} />
            </li>
          ))}
        </ul>
      </section>
    </DemoShell>
  );
}

function memberNames(household: Household, policy: Policy) {
  return policy.coveredMemberIds
    .map((id) => household.members.find((m) => m.id === id)?.name ?? id)
    .join(', ');
}

function policyTerms(
  policy: Policy,
  t: ReturnType<typeof useTranslations>,
  money: (amount: number) => string,
) {
  const { roomRentLimitPerDay, copayPercent, copayFromAge, deductible } = policy.terms;
  return [
    roomRentLimitPerDay && t('roomLimit', { amount: money(roomRentLimitPerDay) }),
    copayPercent > 0 &&
      (copayFromAge
        ? t('copayFromAge', { percent: copayPercent, age: copayFromAge })
        : t('copay', { percent: copayPercent })),
    deductible > 0 && t('deductible', { amount: money(deductible) }),
    policy.claimsUsedThisYear > 0 && t('claimsUsed', { amount: money(policy.claimsUsedThisYear) }),
  ];
}

function Tags({ items }: { items: (string | false | 0 | undefined)[] }) {
  const shown = items.filter((item): item is string => Boolean(item));
  if (shown.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <li
          key={item}
          className="amount rounded-full bg-primary-soft px-2.5 py-0.5 text-body-sm text-primary"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
