'use client';

import type { Household } from '@kavach/schemas';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { EmptyState, ListSkeleton, PageHeader, QueryError } from '@/components/app/page-parts';
import { Icon } from '@/components/kavach/icon';
import { buttonClasses } from '@/components/ui/button';
import { useDate } from '@/components/plan/format';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useActions } from '@/components/plan/queries';
import { Link } from '@/i18n/navigation';

export function ActionsScreen() {
  return <PlanFrame>{(household) => <Actions household={household} />}</PlanFrame>;
}

/** Letters and reminders Kavach drafted, waiting ones first, each opening its review. */
function Actions({ household }: { household: Household }) {
  const t = useTranslations('plan.actions');
  const tp = useTranslations('plan');
  const tr = useTranslations('plan.replan');
  const tq = useTranslations('plan.home.quick');
  const th = useTranslations('plan.home');
  const date = useDate();
  const { data: actions, isError, refetch } = useActions(household.id);
  const sorted = [...(actions ?? [])].sort(
    (a, b) => Number(b.status === 'draft') - Number(a.status === 'draft'),
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t('title')} intro={th('draftsHint')} />
      {isError && !actions ? (
        <QueryError message={tp('error')} retryLabel={tp('retry')} onRetry={() => refetch()} />
      ) : !actions ? (
        <ListSkeleton rows={3} label={tp('loading')} />
      ) : actions.length === 0 ? (
        <EmptyState
          icon="task_alt"
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Link href="/change" className={buttonClasses({ variant: 'secondary' })}>
              <Icon name="alt_route" className="text-xl" />
              {tq('change')}
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((a) => {
            const waiting = a.status === 'draft';
            return (
              <li key={a.id}>
                <Link
                  href={`/actions/${a.id}`}
                  className="group lift press flex items-center gap-4 rounded-lg border border-border bg-surface p-4 shadow-1 hover:border-primary/50 sm:p-5"
                >
                  <span
                    className={clsx(
                      'flex size-11 shrink-0 items-center justify-center rounded-md transition-colors',
                      waiting
                        ? 'bg-partial-bg text-partial'
                        : 'bg-surface-container-low text-primary',
                    )}
                  >
                    <Icon
                      name={a.kind === 'reminder' ? 'notifications_active' : 'description'}
                      className="text-[22px]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-display text-title-md text-on-surface">{a.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-on-surface-variant">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 font-medium',
                          waiting ? 'text-partial' : 'text-on-surface-variant',
                        )}
                      >
                        <Icon
                          name={waiting ? 'pending_actions' : 'check_circle'}
                          className="text-base"
                        />
                        {tr(`status.${a.status}`)}
                      </span>
                      {a.dueDate && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{t('due', { date: date(a.dueDate) })}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <Icon
                    name="chevron_right"
                    className="nudge shrink-0 text-2xl text-outline group-hover:text-primary"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
