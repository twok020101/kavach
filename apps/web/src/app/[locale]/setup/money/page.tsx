'use client';

import type { Country, Finances } from '@kavach/schemas';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Icon } from '@/components/kavach/icon';
import { SetupFrame, SetupLoadState } from '@/components/setup/setup-frame';
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

type Market = {
  symbol: string;
  grouping: string;
  ranges: Record<Field, { max: number; step: number }>;
};

/**
 * Each market's money: the symbol before the amount, how digits group (1,85,000 in India,
 * 185,000 in Singapore), and slider ranges sized to its incomes. A typed value beyond a range
 * stretches it. The market is the household's, which never changes once it is set up.
 */
const MARKETS: Record<Country, Market> = {
  IN: {
    symbol: '₹',
    grouping: 'en-IN',
    ranges: {
      takeHomeMonthly: { max: 5_00_000, step: 5_000 },
      emiMonthly: { max: 2_00_000, step: 1_000 },
      fixedSpendMonthly: { max: 3_00_000, step: 5_000 },
      emergencyFund: { max: 50_00_000, step: 50_000 },
    },
  },
  SG: {
    symbol: 'S$',
    grouping: 'en-SG',
    ranges: {
      takeHomeMonthly: { max: 30_000, step: 500 },
      emiMonthly: { max: 10_000, step: 100 },
      fixedSpendMonthly: { max: 20_000, step: 500 },
      emergencyFund: { max: 300_000, step: 5_000 },
    },
  },
};

const digits = (s: string) => Number(s.replace(/\D/g, '').slice(0, 10)) || 0;

/** S06 Money: four rough numbers that size the budget, with sliders and typed inputs. */
export default function MoneyPage() {
  const t = useTranslations('setup.money');
  const ts = useTranslations('setup');
  const router = useRouter();
  const { data: household, error, refetch, isFetching } = useSetupHousehold();
  const save = useSetFinances(household?.id);
  // Edits start from the saved numbers; `null` until the user changes something.
  const [edited, setFinances] = useState<Finances | null>(null);
  const finances = edited ?? household?.finances ?? EMPTY;
  const [more, setMore] = useState(false);
  const market = MARKETS[household?.country ?? 'IN'];

  const set = (field: keyof Finances, value: number) =>
    setFinances({ ...finances, [field]: value });
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
          disabled={!household || finances.takeHomeMonthly <= 0}
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
      {!household ? (
        <SetupLoadState error={error} retrying={isFetching} onRetry={() => refetch()} rows={4} />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <MoneyField
              label={t('takeHome')}
              field="takeHomeMonthly"
              value={finances.takeHomeMonthly}
              market={market}
              onChange={set}
            />
            <MoneyField
              label={t('emi')}
              field="emiMonthly"
              value={finances.emiMonthly}
              market={market}
              onChange={set}
            >
              {emiHigh && (
                <p className="flex items-start gap-2 text-body-sm text-partial">
                  <Icon name="info" className="mt-px text-base" />
                  {t('emiHigh')}
                </p>
              )}
            </MoneyField>
            <MoneyField
              label={t('spend')}
              hint={t('spendHint')}
              field="fixedSpendMonthly"
              value={finances.fixedSpendMonthly}
              market={market}
              onChange={set}
            />
            <MoneyField
              label={t('fund')}
              field="emergencyFund"
              value={finances.emergencyFund}
              market={market}
              onChange={set}
            />
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              className="press inline-flex min-h-12 items-center gap-1.5 self-start rounded-md px-1 font-medium text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-primary"
              aria-expanded={more}
              onClick={() => setMore((m) => !m)}
            >
              <ChevronDown
                aria-hidden
                className={
                  more ? 'size-5 rotate-180 transition-transform' : 'size-5 transition-transform'
                }
              />
              {t('loans')}
            </button>
            {more && (
              <div className="grid gap-4 sm:grid-cols-2">
                <TypedAmount
                  label={t('loansOutstanding')}
                  value={finances.loansOutstanding}
                  market={market}
                  onChange={(v) => set('loansOutstanding', v)}
                />
                <TypedAmount
                  label={t('income')}
                  hint={t('incomeHint')}
                  value={finances.annualIncome ?? 0}
                  market={market}
                  onChange={(v) => set('annualIncome', v)}
                />
              </div>
            )}
          </div>
        </>
      )}
      {save.isError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-gap-bg p-4 text-gap">
          <Icon name="error" className="mt-0.5 text-lg" />
          {ts('error')}
        </p>
      )}
    </SetupFrame>
  );
}

/** One of the four numbers, on its own card: the label (and hint), the amount, the slider. */
function MoneyField({
  label,
  hint,
  field,
  value,
  market,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  field: Field;
  value: number;
  market: Market;
  onChange: (field: Field, value: number) => void;
  children?: React.ReactNode;
}) {
  const id = useId();
  const range = market.ranges[field];
  const max = Math.max(range.max, value * 2);
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-1 ring-1 ring-border/60 sm:p-5">
      <label htmlFor={id} className="flex flex-col gap-0.5">
        <span className="font-display text-title-md text-on-surface">{label}</span>
        {hint && <span className="text-body-sm text-on-surface-variant">{hint}</span>}
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <AmountInput id={id} value={value} market={market} onChange={(v) => onChange(field, v)} />
        <input
          type="range"
          aria-label={label}
          min={0}
          max={max}
          step={range.step}
          value={value}
          onChange={(e) => onChange(field, Number(e.target.value))}
          className="h-12 min-w-40 flex-1 accent-[var(--primary)]"
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
  market,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  market: Market;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-body-md font-medium text-on-surface">
        {label}
      </label>
      {hint && <span className="text-body-sm text-on-surface-variant">{hint}</span>}
      <AmountInput id={id} value={value} market={market} onChange={onChange} />
    </div>
  );
}

/** An amount input with the market's symbol, grouping digits as you type (1,85,000 or 185,000). */
function AmountInput({
  id,
  value,
  market,
  onChange,
}: {
  id: string;
  value: number;
  market: Market;
  onChange: (value: number) => void;
}) {
  return (
    <span className="flex min-h-12 w-44 shrink-0 items-center rounded-lg border border-outline-variant bg-surface px-3 focus-within:border-primary focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary">
      <span aria-hidden className="text-body-md font-medium text-on-surface-variant">
        {market.symbol}
      </span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value ? value.toLocaleString(market.grouping) : ''}
        placeholder="0"
        onChange={(e) => onChange(digits(e.target.value))}
        style={{ outline: 'none' }}
        className="amount w-full min-w-0 bg-transparent pl-1 text-lg font-semibold tabular-nums text-on-surface"
      />
    </span>
  );
}
