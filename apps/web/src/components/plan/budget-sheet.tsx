'use client';

import type { Budget } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Amount } from '../kavach/amount';
import { RuleList } from './rule-list';
import { Sheet } from './sheet';

/** S12 Budget sheet: R-BG-001 in plain words, with the engine's numbers. */
export function BudgetSheet({
  budget,
  open,
  canEdit,
  onClose,
}: {
  budget: Budget;
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('settings.plan');
  const strong = (value: number) => <Amount value={value} className="font-semibold" />;
  return (
    <Sheet open={open} onClose={onClose} title={t('budgetTitle')}>
      <div className="flex flex-col gap-3 text-lg">
        <p>{t.rich('budgetLeft', { amount: () => strong(budget.disposableMonthly) })}</p>
        <p>{t.rich('budgetTotal', { amount: () => strong(budget.totalMonthly) })}</p>
        <p>
          {t.rich('budgetExisting', {
            existing: () => strong(budget.existingPremiumsMonthly),
            free: () => strong(budget.forNewMonthly),
          })}
        </p>
        {budget.thinEmergencyFund && (
          <p className="rounded-md bg-partial-bg p-3 text-base text-partial">{t('budgetThin')}</p>
        )}
        <RuleList ids={['R-BG-001']} />
        {canEdit && (
          <Link href="/setup/money" className="text-base font-medium text-primary underline">
            {t('budgetChange')}
          </Link>
        )}
      </div>
    </Sheet>
  );
}
