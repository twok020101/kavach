'use client';

import type { Household, Recommendation } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState, type CSSProperties } from 'react';
import { ListSkeleton, PageHeader, pageTitle, QueryError } from '@/components/app/page-parts';
import { Amount } from '@/components/kavach/amount';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Icon } from '@/components/kavach/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { BudgetSheet } from '@/components/plan/budget-sheet';
import { ItemSheet } from '@/components/plan/item-sheet';
import { PlanFrame } from '@/components/plan/plan-frame';
import { usePlan } from '@/components/plan/queries';
import { RecommendationRow } from '@/components/plan/recommendation';
import { Link } from '@/i18n/navigation';

export function PlanScreen() {
  return <PlanFrame>{(household) => <PlanView household={household} />}</PlanFrame>;
}

const rise = (i: number) => ({ '--i': i }) as CSSProperties;
const caps = 'text-label-caps uppercase [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal';

/**
 * S11 Plan, laid out like the Stitch plan screen: eyebrow chips, the headline and what the plan
 * uses of the free budget, a family / budget switch; the prioritised cards on the left with a
 * live count over them and the deferred ones under "Later"; on the right the budget meter, the
 * things to review, a way to tell Kavach what's changing, and the 11 §4 disclaimer.
 */
function PlanView({ household }: { household: Household }) {
  const t = useTranslations('plan.plan');
  const tr = useTranslations('plan.rec');
  const tq = useTranslations('plan.home.quick');
  const tp = useTranslations('plan');
  const { data: plan, isError, refetch } = usePlan(household.id);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [item, setItem] = useState<Recommendation>();
  if (!plan) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t('title')} />
        {isError ? (
          <QueryError message={tp('error')} retryLabel={tp('retry')} onRetry={() => refetch()} />
        ) : (
          <div
            className="grid grid-cols-1 gap-6 lg:grid-cols-12"
            aria-busy
            aria-label={tp('loading')}
          >
            <ListSkeleton rows={4} rowClassName="h-28" className="lg:col-span-8" />
            <div className="flex flex-col gap-6 lg:col-span-4">
              <Skeleton className="h-44 rounded-lg" />
              <Skeleton className="h-36 rounded-lg" />
            </div>
          </div>
        )}
      </div>
    );
  }

  const selected = plan.recommendations.filter((r) => r.status === 'selected');
  const later = plan.recommendations.filter((r) => r.status === 'deferred');
  const { budget } = plan;
  const policy = (id: string) => household.policies.find((p) => p.id === id);
  const used = Math.min(1, budget.forNewMonthly > 0 ? plan.monthlySpend / budget.forNewMonthly : 1);
  const rules = new Set(plan.trace.map((f) => f.ruleId)).size;

  return (
    <div className="flex flex-col gap-8">
      <header className="rise-in flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col">
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`rounded-full bg-surface-container-high px-2.5 py-0.5 text-primary ${caps}`}
            >
              {t('eyebrow')}
            </span>
            {rules > 0 && (
              <>
                <span aria-hidden className="text-on-surface-variant/40">
                  •
                </span>
                <span className="flex items-center gap-1 font-serif text-citation-sm text-on-surface-variant">
                  <Icon name="verified_user" className="text-sm text-safe" />
                  {t('traced', { count: rules })}
                </span>
              </>
            )}
          </div>
          <h1 className={pageTitle}>{t('title')}</h1>
          <p className="mt-1 max-w-[70ch] text-body-md text-on-surface-variant sm:text-body-lg">
            {t.rich('uses', {
              spend: () => (
                <Amount value={plan.monthlySpend} className="font-semibold text-primary" />
              ),
              budget: () => (
                <Amount value={budget.forNewMonthly} className="font-semibold text-on-surface" />
              ),
            })}
          </p>
        </div>
        {/* Whose plan this is, and the budget behind it (Stitch segmented control). */}
        <div className="flex items-center gap-1 self-start rounded-lg bg-surface-container-low p-1 shadow-1 sm:self-auto">
          <span className="flex min-h-12 min-w-0 items-center gap-1.5 rounded-md bg-surface px-3.5 font-display text-title-md text-primary shadow-1">
            <Icon name="verified" className="text-lg" />
            <span className="truncate">{household.name}</span>
          </span>
          <button
            type="button"
            onClick={() => setBudgetOpen(true)}
            className="press flex min-h-12 items-center gap-1.5 rounded-md px-3.5 font-display text-title-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="tune" className="text-lg" />
            {t('budget')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-8 lg:col-span-8">
          <section aria-labelledby="prioritised" className="flex flex-col gap-4">
            {/* The count line over the list: how many of the engine's items are in the plan. */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
              <h2
                id="prioritised"
                className="flex items-center gap-2.5 font-display text-title-md text-on-surface"
              >
                <span className="live-dot" />
                {t('prioritised')}
              </h2>
              <span className="text-body-sm text-on-surface-variant">
                {t('ofTotal', { count: selected.length, total: plan.recommendations.length })}
              </span>
            </div>
            <ol className="stagger flex flex-col gap-4">
              {selected.map((r, i) => (
                <RecommendationRow
                  key={r.id}
                  household={household}
                  rec={r}
                  index={i + 1}
                  onSelect={() => setItem(r)}
                />
              ))}
            </ol>
          </section>

          {later.length > 0 && (
            <section aria-labelledby="later" className="flex flex-col gap-3">
              <h2
                id="later"
                className="flex items-center gap-2 px-1 font-display text-headline-sm text-on-surface"
              >
                <Icon name="schedule" className="text-xl text-outline" />
                {t('later')}
              </h2>
              <ul className="flex flex-col gap-3">
                {later.map((r) => (
                  <RecommendationRow
                    key={r.id}
                    household={household}
                    rec={r}
                    onSelect={() => setItem(r)}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="stagger flex min-w-0 flex-col gap-6 lg:sticky lg:top-24 lg:col-span-4">
          <div style={rise(2)}>
            <button
              type="button"
              onClick={() => setBudgetOpen(true)}
              className="group lift press flex w-full flex-col gap-5 rounded-lg border border-border/60 bg-surface p-5 text-left shadow-1 hover:border-primary/40 sm:p-6"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary">
                  <Icon name="account_balance_wallet" className="text-[22px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-title-md text-on-surface">
                    {t('howBudget')}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    {tr.rich('perMonth', {
                      amount: () => <Amount value={budget.forNewMonthly} />,
                    })}
                  </span>
                </span>
                <Icon
                  name="chevron_right"
                  className="nudge text-xl text-outline group-hover:text-primary"
                />
              </span>
              {/* The meter: what the plan uses of the free monthly budget, and what is left. */}
              <span className="flex flex-col gap-2">
                <span
                  className={`flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-on-surface-variant ${caps}`}
                >
                  <span>
                    {t('allocated')}:{' '}
                    <Amount value={plan.monthlySpend} className="text-on-surface" />
                  </span>
                  <span>
                    {t('leftOver')}:{' '}
                    <Amount
                      value={Math.max(0, budget.forNewMonthly - plan.monthlySpend)}
                      className="text-on-surface"
                    />
                  </span>
                </span>
                <span
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={budget.forNewMonthly}
                  aria-valuenow={plan.monthlySpend}
                  aria-label={t('used', { pct: Math.round(used * 100) })}
                  className="block h-2.5 w-full overflow-hidden rounded-full bg-surface-container"
                >
                  <span
                    className="meter-fill block h-full rounded-full bg-primary transition-[width] duration-300 ease-[var(--ease-out-strong)]"
                    style={{ width: `${Math.round(used * 100)}%` }}
                  />
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  {t('used', { pct: Math.round(used * 100) })}
                </span>
              </span>
            </button>
          </div>

          {plan.reviews.length > 0 && (
            <section aria-labelledby="review" className="flex flex-col gap-2" style={rise(3)}>
              <h2 id="review" className="px-1 font-display text-headline-sm text-on-surface">
                {t('review')}
              </h2>
              <ul className="flex flex-col gap-3">
                {plan.reviews.map((r) => (
                  <li key={r.policyId + r.issue}>
                    {/* Each review is a warning-toned card that opens the policy it is about. */}
                    <Link
                      href={`/policies/${r.policyId}`}
                      className="group lift press flex flex-col gap-2 rounded-lg border border-partial/15 bg-partial-bg p-5 hover:border-partial/50"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex items-center gap-2 font-display text-title-md font-bold text-on-surface">
                          <span
                            aria-hidden
                            className="size-2.5 shrink-0 rounded-full bg-secondary"
                          />
                          {policy(r.policyId)?.productName}
                        </span>
                        <Icon name="warning" className="mt-0.5 text-lg text-secondary" />
                      </span>
                      <span className="font-serif text-citation-md leading-relaxed text-secondary">
                        {t(`reviewIssue.${r.issue}`)}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 font-display text-title-md text-secondary group-hover:underline">
                        {t('openPolicy')}
                        <Icon name="arrow_forward" className="nudge text-base" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Plans follow life: the way to tell Kavach what's changing (the change flow re-plans). */}
          <div
            className="flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-4 shadow-1"
            style={rise(4)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-safe text-surface">
                <Icon name="alt_route" className="text-lg" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-display text-title-md leading-tight text-on-surface">
                  {t('helpTitle')}
                </span>
                <span className="text-body-sm text-on-surface-variant">{tq('changeHint')}</span>
              </span>
            </span>
            <Link
              href="/change"
              className="press flex min-h-12 shrink-0 items-center rounded-md bg-surface px-3.5 font-display text-title-md text-primary shadow-1 transition-colors hover:bg-surface-container"
            >
              {t('helpAction')}
            </Link>
          </div>

          <div className="flex items-start gap-1.5 px-1" style={rise(5)}>
            <Icon name="policy" className="mt-0.5 text-[15px] text-safe" />
            <DisclaimerBar
              kind="plan"
              className="border-0 pt-0 font-serif leading-relaxed text-on-surface-variant"
            />
          </div>
        </aside>
      </div>

      <BudgetSheet
        budget={budget}
        open={budgetOpen}
        canEdit={!household.isDemo}
        onClose={() => setBudgetOpen(false)}
      />
      <ItemSheet household={household} rec={item} onClose={() => setItem(undefined)} />
    </div>
  );
}
