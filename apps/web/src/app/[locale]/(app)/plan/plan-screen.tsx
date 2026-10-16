'use client';

import type { Household, Recommendation } from '@kavach/schemas';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Card } from '@/components/ui/card';
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
  if (!plan) return null;

  const selected = plan.recommendations.filter((r) => r.status === 'selected');
  const later = plan.recommendations.filter((r) => r.status === 'deferred');
  const { budget } = plan;
  const policy = (id: string) => household.policies.find((p) => p.id === id);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
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
          <Card className="p-0 sm:p-0">
            <button
              onClick={() => setBudgetOpen(true)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-sunken"
            >
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{t('howBudget')}</span>
                <span className="text-sm text-muted">
                  {tr.rich('perMonth', { amount: () => <Amount value={budget.forNewMonthly} /> })}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-primary" />
            </button>
          </Card>

          {plan.reviews.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display text-lg font-semibold text-muted">{t('review')}</h2>
              <ul className="flex flex-col gap-2">
                {plan.reviews.map((r) => (
                  <li
                    key={r.policyId + r.issue}
                    className="rounded-md border border-border bg-surface p-3"
                  >
                    <p className="font-semibold">{policy(r.policyId)?.productName}</p>
                    <p className="text-sm text-muted">{t(`reviewIssue.${r.issue}`)}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="text-xs text-muted">{t('disclaimer')}</p>
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
