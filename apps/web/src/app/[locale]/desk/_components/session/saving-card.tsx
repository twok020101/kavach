'use client';

import type { BranchResult, RoomOptionResult } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useMoney } from '@/lib/country';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { RoomCompare } from '@/components/kavach/room-compare';
import { cn } from '@/components/ui/cn';
import { Disclosure } from '@/components/ui/disclosure';
import { CountOnce } from './count-once';
import { deductionLabel, savingPair } from './labels';

/**
 * The saving card (Stitch "Save ₹90,000"): the engine's saving between the costliest room for the
 * family and the one Kavach recommends, a green action that asks Kavach what to say at the desk,
 * and the two rooms side by side down to what the family pays. The two out-of-pocket figures
 * subtract to the headline. More than two rooms: the full comparison opens below.
 */
export function SavingCard({
  result,
  busy,
  onOpt,
}: {
  result: BranchResult;
  busy: boolean;
  /** Ask Kavach (and the desk) for the recommended room. */
  onOpt: (room: string) => void;
}) {
  const t = useTranslations('desk.session');
  const money = useMoney();
  const { pick, costliest } = savingPair(result);
  if (!pick || !costliest) return null;
  const none = result.saving <= 0 || pick.roomCategoryId === costliest.roomCategoryId;
  const ruleIds = [...new Set(costliest.deductions.map((d) => d.ruleId))];

  return (
    <section
      aria-labelledby="saving-title"
      data-desk-saving
      className="rise-in @container flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-sm border border-primary/15 bg-primary-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-hover">
          {t('saving.eyebrow')}
        </span>
        {ruleIds.length > 0 && (
          <span className="flex flex-wrap gap-1">
            {ruleIds.map((id) => (
              <span
                key={id}
                className="rounded-sm border border-border bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-muted"
              >
                {id}
              </span>
            ))}
          </span>
        )}
      </div>

      {none ? (
        <p id="saving-title" className="text-base font-semibold text-text">
          {t('saving.none')}
        </p>
      ) : (
        <>
          <div>
            <h3
              id="saving-title"
              className="font-display text-2xl font-extrabold tracking-tight text-text"
            >
              {t.rich('saving.headline', {
                amount: () => <CountOnce value={result.saving} delay={300} className="text-safe" />,
              })}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {t('saving.sub', {
                room: pick.label,
                rent: money(pick.rentPerDay),
                costly: costliest.label,
              })}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpt(pick.label)}
            className="btn press inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-safe px-4 text-base font-bold text-white shadow-1 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="check" weight={600} className="text-xl" />
            {t('saving.opt', { room: pick.label })}
          </button>
          <div className="grid gap-3 @[22rem]:grid-cols-2">
            <RoomBox option={costliest} tone="costly" />
            <RoomBox option={pick} tone="pick" />
          </div>
        </>
      )}

      {result.options.length > 2 && (
        <Disclosure
          label={t('saving.allRooms', { count: result.options.length })}
          icon={<Icon name="compare_arrows" className="text-xl" />}
          className="-mb-2 border-t border-border pt-1"
        >
          <RoomCompare result={result} />
        </Disclosure>
      )}
    </section>
  );
}

function RoomBox({ option, tone }: { option: RoomOptionResult; tone: 'costly' | 'pick' }) {
  const t = useTranslations('desk.session');
  const money = useMoney();
  const pick = tone === 'pick';
  const rows: { label: string; amount: number; minus?: boolean }[] = [
    { label: t('saving.rows.bill'), amount: option.bill },
    ...option.deductions.map((d) => ({
      label: deductionLabel(t, d),
      amount: d.amount,
      minus: true,
    })),
    ...(option.copay > 0 ? [{ label: t('saving.rows.copay'), amount: option.copay }] : []),
    { label: t('saving.rows.policyPays'), amount: option.policyPays },
  ];
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border-2 p-3',
        pick ? 'border-safe/50 bg-safe-bg/50' : 'border-gap/30 bg-gap-bg/40',
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-1 border-b pb-2',
          pick ? 'border-safe/25' : 'border-gap/20',
        )}
      >
        <span
          className={cn(
            'inline-flex items-center gap-1 self-start rounded-sm px-1.5 py-0.5 text-[11px] font-bold',
            pick ? 'bg-safe text-white' : 'bg-gap-bg text-gap',
          )}
        >
          <Icon name={pick ? 'verified' : 'trending_up'} fill={pick} className="text-sm" />
          {pick ? t('saving.pick') : t('saving.costliest')}
        </span>
        <span className="text-sm font-bold leading-snug text-text">{option.label}</span>
        <span className="text-xs text-muted">
          {t('saving.perDay', { rent: money(option.rentPerDay) })}
        </span>
      </div>
      <dl className="flex flex-col gap-1 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-2">
            <dt className="min-w-0 text-muted">{r.label}</dt>
            <dd className={cn('shrink-0', r.minus ? 'font-semibold text-gap' : 'text-text')}>
              {r.minus && '−'}
              <Amount value={r.amount} />
            </dd>
          </div>
        ))}
      </dl>
      <div
        className={cn(
          'mt-auto flex items-baseline justify-between gap-2 border-t pt-2',
          pick ? 'border-safe/25' : 'border-gap/20',
        )}
      >
        <span className="text-xs font-bold text-text">{t('saving.rows.youPay')}</span>
        <Amount
          value={option.outOfPocket}
          className={cn('font-display text-lg font-extrabold', pick ? 'text-safe' : 'text-gap')}
        />
      </div>
    </div>
  );
}
