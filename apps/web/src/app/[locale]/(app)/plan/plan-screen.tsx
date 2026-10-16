'use client';

import type { Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { PlanFrame } from '@/components/plan/plan-frame';
import { usePlan } from '@/components/plan/queries';
import { RecommendationRow } from '@/components/plan/recommendation';
import { RuleList } from '@/components/plan/rule-list';

export function PlanScreen() {
  return <PlanFrame>{(household) => <PlanView household={household} />}</PlanFrame>;
}

function PlanView({ household }: { household: Household }) {
  const t = useTranslations('plan.plan');
  const { data: plan } = usePlan(household.id);
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

      <Card className="p-3 sm:p-4">
        <Disclosure label={t('howBudget')}>
          <p className="text-sm">
            {t.rich('budgetExplain', {
              left: () => <Amount value={budget.disposableMonthly} />,
              total: () => <Amount value={budget.totalMonthly} />,
              existing: () => <Amount value={budget.existingPremiumsMonthly} />,
              free: () => <Amount value={budget.forNewMonthly} />,
            })}
          </p>
          {budget.thinEmergencyFund && <p className="mt-2 text-sm text-partial">{t('thinFund')}</p>}
          <div className="mt-3">
            <RuleList ids={['R-BG-001', 'R-OP-001']} />
          </div>
        </Disclosure>
      </Card>

      <ol className="flex flex-col gap-2">
        {selected.map((r, i) => (
          <RecommendationRow key={r.id} household={household} rec={r} index={i + 1} />
        ))}
      </ol>

      {later.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-muted">{t('later')}</h2>
          <ul className="flex flex-col gap-2">
            {later.map((r) => (
              <RecommendationRow key={r.id} household={household} rec={r} />
            ))}
          </ul>
        </section>
      )}

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
    </div>
  );
}
