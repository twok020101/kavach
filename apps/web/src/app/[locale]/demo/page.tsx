'use client';

import { formatInr } from '@kavach/engine';
import { DemoCheckpoint, type Household, type Policy } from '@kavach/schemas';
import { useFormatter, useTranslations } from 'next-intl';
import { useDemoControls, useHousehold } from '@/lib/household';

/** Dev page: starts the demo and shows the household, with the S29 checkpoint controls. */
export default function DemoPage() {
  const t = useTranslations('household');
  const format = useFormatter();
  const { data: household, error, refetch } = useHousehold();
  const { reset } = useDemoControls(household?.id);

  if (error) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
        <p className="rounded-md bg-gap-bg p-4 text-gap">{t('error')}</p>
        <button className="self-start text-primary underline" onClick={() => refetch()}>
          {t('retry')}
        </button>
      </main>
    );
  }
  if (!household) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-muted">{t('loading')}</main>;
  }

  const date = (iso: string) => format.dateTime(new Date(iso), { dateStyle: 'medium' });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted">{t('intro')}</p>
        {household.asOf && (
          <span className="self-start rounded-sm bg-accent px-2 py-1 text-sm font-semibold text-accent-ink">
            {t('demoDate', { date: date(household.asOf) })}
          </span>
        )}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t('checkpointsHeading')}</h2>
        <div className="flex flex-wrap gap-2">
          {DemoCheckpoint.options.map((checkpoint) => (
            <button
              key={checkpoint}
              disabled={reset.isPending}
              onClick={() => reset.mutate(checkpoint)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {t(`checkpoints.${checkpoint}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t('membersHeading')}</h2>
        <ul className="flex flex-col gap-2">
          {household.members.map((member) => (
            <li key={member.id} className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{member.name}</span>
                <span className="text-sm text-muted">
                  {t(`relations.${member.relation}`)} · {t('age', { age: member.age })}
                </span>
              </div>
              <Tags
                items={[
                  member.language === 'hi' && t('speaksHindi'),
                  ...member.conditions.map((c) =>
                    t.has(`conditions.${c}`) ? t(`conditions.${c}`) : c,
                  ),
                ]}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t('policiesHeading')}</h2>
        <ul className="flex flex-col gap-2">
          {household.policies.map((policy) => (
            <li key={policy.id} className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{policy.productName}</span>
                <span className="text-sm text-muted">{t(`kinds.${policy.kind}`)}</span>
              </div>
              <p className="text-sm text-muted">
                {policy.insurer} · {t('validTill', { date: date(policy.endDate) })}
              </p>
              <p className="amount text-sm">
                {t('sumInsured', { amount: formatInr(policy.sumInsured) })} ·{' '}
                {t('covers', { names: memberNames(household, policy) })}
              </p>
              <Tags items={policyTerms(policy, t)} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function memberNames(household: Household, policy: Policy) {
  return policy.coveredMemberIds
    .map((id) => household.members.find((m) => m.id === id)?.name ?? id)
    .join(', ');
}

function policyTerms(policy: Policy, t: ReturnType<typeof useTranslations>) {
  const { roomRentLimitPerDay, copayPercent, copayFromAge, deductible } = policy.terms;
  return [
    roomRentLimitPerDay && t('roomLimit', { amount: formatInr(roomRentLimitPerDay) }),
    copayPercent > 0 &&
      (copayFromAge
        ? t('copayFromAge', { percent: copayPercent, age: copayFromAge })
        : t('copay', { percent: copayPercent })),
    deductible > 0 && t('deductible', { amount: formatInr(deductible) }),
    policy.claimsUsedThisYear > 0 &&
      t('claimsUsed', { amount: formatInr(policy.claimsUsedThisYear) }),
  ];
}

function Tags({ items }: { items: (string | false | 0 | undefined)[] }) {
  const shown = items.filter((item): item is string => Boolean(item));
  if (shown.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1">
      {shown.map((item) => (
        <li
          key={item}
          className="amount rounded-sm bg-primary-soft px-2 py-0.5 text-xs text-primary"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
