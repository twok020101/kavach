'use client';

import type { Household, Recommendation } from '@kavach/schemas';
import { ArrowRight, ChevronRight, Clock, TriangleAlert, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Reveal } from '@/components/kavach/reveal';
import { Card } from '@/components/ui/card';
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

/**
 * S11 Plan, laid out like the Stitch plan screen: the prioritised cards on the left with a
 * count line over them and the deferred ones in a sunken "Later" group; the budget meter,
 * the things to review and the 11 §4 disclaimer in a column on the right.
 */
function PlanView({ household }: { household: Household }) {
  const t = useTranslations('plan.plan');
  const tr = useTranslations('plan.rec');
  const { data: plan } = usePlan(household.id);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [item, setItem] = useState<Recommendation>();
  if (!plan) {
    return (
      <div className="flex flex-col gap-3" aria-busy>
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  const selected = plan.recommendations.filter((r) => r.status === 'selected');
  const later = plan.recommendations.filter((r) => r.status === 'deferred');
  const { budget } = plan;
  const policy = (id: string) => household.policies.find((p) => p.id === id);
  const used = Math.min(1, budget.forNewMonthly > 0 ? plan.monthlySpend / budget.forNewMonthly : 1);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="text-muted">
          {t.rich('uses', {
            spend: () => <Amount value={plan.monthlySpend} className="font-semibold text-text" />,
            budget: () => (
              <Amount value={budget.forNewMonthly} className="font-semibold text-text" />
            ),
          })}
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <section aria-labelledby="prioritised" className="flex flex-col gap-3">
            {/* The count line over the list: how many of the engine's items are in the plan. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1">
              <h2 id="prioritised" className="font-display font-semibold">
                {t('prioritised')}
              </h2>
              <span className="text-sm text-muted">
                {t('ofTotal', { count: selected.length, total: plan.recommendations.length })}
              </span>
            </div>
            <ol className="flex flex-col gap-3">
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
            // The deferred group sits on a sunken surface, so it reads as a second tier.
            <section
              aria-labelledby="later"
              className="flex flex-col gap-3 rounded-md bg-sunken p-3 sm:p-4"
            >
              <h2
                id="later"
                className="flex items-center gap-2 px-1 font-display text-lg font-semibold"
              >
                <Clock aria-hidden className="size-5 text-muted" />
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

        <aside className="flex flex-col gap-5 lg:sticky lg:top-8">
          <Reveal>
            <Card className="p-0 sm:p-0">
              <button
                onClick={() => setBudgetOpen(true)}
                className="press flex w-full flex-col gap-4 rounded-md p-4 text-left hover:bg-sunken sm:p-5"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Wallet aria-hidden className="size-6" strokeWidth={1.75} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display font-semibold">{t('howBudget')}</span>
                    <span className="text-sm text-muted">
                      {tr.rich('perMonth', {
                        amount: () => <Amount value={budget.forNewMonthly} />,
                      })}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-primary" />
                </span>
                {/* The meter: what the plan uses of the free monthly budget, and what is left,
                    labelled over the bar (Stitch 07). */}
                <span className="flex flex-col gap-1.5">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="label">
                      {t('allocated')}:{' '}
                      <Amount
                        value={plan.monthlySpend}
                        className="text-sm font-semibold normal-case tracking-normal text-text"
                      />
                    </span>
                    <span className="label">
                      {t('leftOver')}:{' '}
                      <Amount
                        value={Math.max(0, budget.forNewMonthly - plan.monthlySpend)}
                        className="text-sm font-semibold normal-case tracking-normal text-text"
                      />
                    </span>
                  </span>
                  <span
                    role="meter"
                    aria-valuemin={0}
                    aria-valuemax={budget.forNewMonthly}
                    aria-valuenow={plan.monthlySpend}
                    className="block h-2.5 w-full overflow-hidden rounded-sm bg-sunken"
                  >
                    <span
                      className="block h-full rounded-sm bg-primary transition-[width] duration-300 ease-[var(--ease-out-strong)]"
                      style={{ width: `${Math.round(used * 100)}%` }}
                    />
                  </span>
                </span>
              </button>
            </Card>
          </Reveal>

          {plan.reviews.length > 0 && (
            <Reveal as="section" delay={0.05} className="flex flex-col gap-2">
              <h2 className="px-1 font-display text-lg font-semibold">{t('review')}</h2>
              <ul className="flex flex-col gap-2">
                {plan.reviews.map((r) => (
                  <li key={r.policyId + r.issue}>
                    {/* Each review is a warning-toned card that opens the policy it is about. */}
                    <Link
                      href={`/policies/${r.policyId}`}
                      className="panel panel-partial press flex min-h-12 flex-col gap-2 hover:border-partial"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-display font-semibold">
                          {policy(r.policyId)?.productName}
                        </span>
                        <TriangleAlert
                          aria-hidden
                          className="mt-0.5 size-5 shrink-0 text-partial"
                        />
                      </span>
                      <span className="text-sm text-partial">{t(`reviewIssue.${r.issue}`)}</span>
                      <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-partial">
                        {t('openPolicy')}
                        <ArrowRight aria-hidden className="size-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          <DisclaimerBar kind="plan" />
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
