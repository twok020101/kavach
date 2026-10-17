'use client';

import type { Household, Recommendation } from '@kavach/schemas';
import { ChevronRight, Wallet } from 'lucide-react';
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

export function PlanScreen() {
  return <PlanFrame>{(household) => <PlanView household={household} />}</PlanFrame>;
}

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
        <h1 className="font-display text-3xl font-bold tracking-tight">{t('title')}</h1>
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
          <ol className="flex flex-col gap-2">
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

          {later.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-semibold text-muted">{t('later')}</h2>
              <ul className="flex flex-col gap-2">
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
                className="press flex w-full flex-col gap-3 rounded-md p-4 text-left hover:bg-sunken sm:p-5"
              >
                <span className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Wallet aria-hidden className="size-5" />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{t('howBudget')}</span>
                    <span className="text-sm text-muted">
                      {tr.rich('perMonth', {
                        amount: () => <Amount value={budget.forNewMonthly} />,
                      })}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-5 text-primary" />
                </span>
                {/* The meter: how much of the free monthly budget the plan uses. */}
                <span
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={budget.forNewMonthly}
                  aria-valuenow={plan.monthlySpend}
                  className="block h-2.5 w-full overflow-hidden rounded-sm bg-sunken"
                >
                  <span
                    className="block h-full rounded-sm bg-primary transition-[width] duration-600 ease-[var(--ease-out-strong)]"
                    style={{ width: `${Math.round(used * 100)}%` }}
                  />
                </span>
              </button>
            </Card>
          </Reveal>

          {plan.reviews.length > 0 && (
            <Reveal as="section" delay={0.05} className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-semibold text-muted">{t('review')}</h2>
              <ul className="flex flex-col gap-2">
                {plan.reviews.map((r) => (
                  <li key={r.policyId + r.issue} className="panel panel-partial">
                    <p className="font-semibold">{policy(r.policyId)?.productName}</p>
                    <p className="text-sm text-partial">{t(`reviewIssue.${r.issue}`)}</p>
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
