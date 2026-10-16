'use client';

import type { Finances } from '@kavach/schemas';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { SetupFrame } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { useSetFinances } from '@/lib/setup';

type Field = 'takeHomeMonthly' | 'emiMonthly' | 'fixedSpendMonthly' | 'emergencyFund';

const EMPTY: Finances = {
  takeHomeMonthly: 0,
  emiMonthly: 0,
  fixedSpendMonthly: 0,
  emergencyFund: 0,
  loansOutstanding: 0,
};

/** Default slider ranges; a typed value beyond them stretches the range. */
const RANGES: Record<Field, { max: number; step: number }> = {
  takeHomeMonthly: { max: 5_00_000, step: 5_000 },
  emiMonthly: { max: 2_00_000, step: 1_000 },
  fixedSpendMonthly: { max: 3_00_000, step: 5_000 },
  emergencyFund: { max: 50_00_000, step: 50_000 },
};

const grouped = (n: number) => (n ? n.toLocaleString('en-IN') : '');
const digits = (s: string) => Number(s.replace(/\D/g, '').slice(0, 10)) || 0;

/** S06 Money: four rough numbers that size the budget, with sliders and typed inputs. */
export default function MoneyPage() {
  const t = useTranslations('setup.money');
  const ts = useTranslations('setup');
  const router = useRouter();
  const { data: household } = useSetupHousehold();
  const save = useSetFinances(household?.id);
  const [finances, setFinances] = useState<Finances>(EMPTY);
  const [more, setMore] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (household && !loaded) {
      if (household.finances) setFinances(household.finances);
      setLoaded(true);
    }
  }, [household, loaded]);

  const set = (field: keyof Finances, value: number) =>
    setFinances((f) => ({ ...f, [field]: value }));
  const emiHigh =
    finances.takeHomeMonthly > 0 && finances.emiMonthly > finances.takeHomeMonthly / 2;

  return (
    <SetupFrame
      step={2}
      back="/setup/family/confirm"
      title={t('title')}
      intro={t('intro')}
      footer={
        <Button
          size="lg"
          disabled={finances.takeHomeMonthly <= 0}
          loading={save.isPending}
          onClick={() =>
            save.mutate(
              {
                ...finances,
                annualIncome: finances.annualIncome || undefined,
              },
              { onSuccess: () => router.push('/setup/documents') },
            )
          }
        >
          {ts('continue')}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <MoneyField
          label={t('takeHome')}
          field="takeHomeMonthly"
          value={finances.takeHomeMonthly}
          onChange={set}
        />
        <MoneyField label={t('emi')} field="emiMonthly" value={finances.emiMonthly} onChange={set}>
          {emiHigh && <p className="text-sm text-partial">{t('emiHigh')}</p>}
        </MoneyField>
        <MoneyField
          label={t('spend')}
          hint={t('spendHint')}
          field="fixedSpendMonthly"
          value={finances.fixedSpendMonthly}
          onChange={set}
        />
        <MoneyField
          label={t('fund')}
          field="emergencyFund"
          value={finances.emergencyFund}
          onChange={set}
        />
      </div>

      <div className="flex flex-col gap-4">
        <button
          className="flex items-center gap-1 self-start font-medium text-primary"
          aria-expanded={more}
          onClick={() => setMore((m) => !m)}
        >
          <ChevronDown aria-hidden className={more ? 'size-5 rotate-180' : 'size-5'} />
          {t('loans')}
        </button>
        {more && (
          <>
            <TypedAmount
              label={t('loansOutstanding')}
              value={finances.loansOutstanding}
              onChange={(v) => set('loansOutstanding', v)}
            />
            <TypedAmount
              label={t('income')}
              hint={t('incomeHint')}
              value={finances.annualIncome ?? 0}
              onChange={(v) => set('annualIncome', v)}
            />
          </>
        )}
      </div>
      {save.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </SetupFrame>
  );
}

function MoneyField({
  label,
  hint,
  field,
  value,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  field: Field;
  value: number;
  onChange: (field: Field, value: number) => void;
  children?: React.ReactNode;
}) {
  const id = useId();
  const range = RANGES[field];
  const max = Math.max(range.max, value * 2);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {hint && <span className="text-sm text-muted">{hint}</span>}
      </label>
      <div className="flex items-center gap-4">
        <AmountInput id={id} value={value} onChange={(v) => onChange(field, v)} />
        <input
          type="range"
          aria-label={label}
          min={0}
          max={max}
          step={range.step}
          value={value}
          onChange={(e) => onChange(field, Number(e.target.value))}
          className="h-12 flex-1 accent-[var(--primary)]"
        />
      </div>
      {children}
    </div>
  );
}

function TypedAmount({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint && <span className="text-sm text-muted">{hint}</span>}
      <AmountInput id={id} value={value} onChange={onChange} />
    </div>
  );
}

/** ₹ input that shows Indian grouping (1,85,000) as you type. */
function AmountInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <span className="flex min-h-12 w-40 shrink-0 items-center rounded-md border border-border-strong bg-surface px-3 focus-within:outline-2 focus-within:outline-primary">
      <span aria-hidden className="text-muted">
        ₹
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={grouped(value)}
        placeholder="0"
        onChange={(e) => onChange(digits(e.target.value))}
        className="amount w-full bg-transparent pl-1 text-lg font-semibold tabular-nums outline-none"
      />
    </span>
  );
}
