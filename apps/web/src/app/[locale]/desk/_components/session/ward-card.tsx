'use client';

import type {
  DeskEvaluation,
  HospitalEstimate,
  RoomOptionResult,
  RuleFiring,
} from '@kavach/schemas';
import { useLocale, useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { cn } from '@/components/ui/cn';
import { useMoney } from '@/lib/country';

/** A field of a firing's inputs or output, when it is there and of that type. */
const field = (record: unknown, key: string) =>
  record && typeof record === 'object' ? (record as Record<string, unknown>)[key] : undefined;
const num = (record: unknown, key: string) => {
  const value = field(record, key);
  return typeof value === 'number' ? value : undefined;
};
const text = (record: unknown, key: string) => {
  const value = field(record, key);
  return typeof value === 'string' ? value : undefined;
};

type Payers = { mshl: number; plan: number; rider?: number; family: number };

/** Table cells: tighter on a phone, where three columns share 310 px. */
const cell = 'px-2 sm:px-3';

/**
 * Singapore only: the ward class explained and who pays in each ward (MediShield Life, the
 * Integrated Shield Plan, its rider, the family), from the engine's own result and trace. The
 * plan's ward entitlement and pro-ration come from R-SG-005, MediShield Life's factors from
 * R-SG-001, and the rider's part from R-SG-003, R-SG-004 and R-SG-006: the deductible and the
 * co-insurance it takes off the family. The columns add up to the hospital bill.
 */
export function WardCard({
  evaluation,
  estimate,
}: {
  evaluation: DeskEvaluation;
  estimate?: HospitalEstimate;
}) {
  const t = useTranslations('desk.session.ward');
  const locale = useLocale();
  const money = useMoney();
  const { trace, primary: result } = evaluation;
  const percent = (n: number) => new Intl.NumberFormat(locale, { style: 'percent' }).format(n);

  const firing = (ruleId: string, room: string, policyId?: string): RuleFiring | undefined =>
    trace.find(
      (f) =>
        f.ruleId === ruleId &&
        f.inputs.roomCategoryId === room &&
        (policyId === undefined || f.inputs.policyId === policyId),
    );
  const planId = text(trace.find((f) => f.ruleId === 'R-SG-005')?.inputs, 'policyId');
  const mshlId = text(trace.find((f) => f.ruleId === 'R-SG-001')?.inputs, 'policyId');
  if (!planId && !mshlId) return null;

  const quotedId = estimate?.roomCategories[0]?.id;
  const rooms = [quotedId, result.recommendedRoomCategoryId]
    .filter((id, i, all): id is string => !!id && all.indexOf(id) === i)
    .map((id) => result.options.find((o) => o.roomCategoryId === id))
    .filter((o): o is RoomOptionResult => !!o);
  if (rooms.length === 0) return null;

  const payers = (o: RoomOptionResult): Payers => {
    const share = (id?: string) => o.policyShares.find((s) => s.policyId === id)?.pays ?? 0;
    const plan = share(planId);
    const deductible = num(firing('R-SG-003', o.roomCategoryId, planId)?.inputs, 'deductible');
    const coinsurance = num(firing('R-SG-004', o.roomCategoryId, planId)?.output, 'coinsurance');
    const rider = firing('R-SG-006', o.roomCategoryId, planId)?.output;
    const familyDeductible = num(rider, 'familyDeductible');
    const familyCoPayment = num(rider, 'familyCoPayment');
    const riderPays =
      deductible !== undefined &&
      coinsurance !== undefined &&
      familyDeductible !== undefined &&
      familyCoPayment !== undefined
        ? Math.min(plan, Math.max(0, deductible - familyDeductible + coinsurance - familyCoPayment))
        : undefined;
    return {
      mshl: share(mshlId),
      plan: plan - (riderPays ?? 0),
      rider: riderPays,
      family: o.outOfPocket,
    };
  };
  const columns = rooms.map((o) => ({ option: o, payers: payers(o) }));
  const withRider = columns.some((c) => c.payers.rider !== undefined);

  const ward = (code?: string) => (code ? t('wardName', { ward: code }) : '');
  const entitlement = text(trace.find((f) => f.ruleId === 'R-SG-005')?.inputs, 'entitlement');
  const quoted = rooms[0]!;
  const mshlQuoted = firing('R-SG-001', quoted.roomCategoryId, mshlId)?.inputs;
  const mshlFactor = num(mshlQuoted, 'factor');
  const mshlSurgical = num(mshlQuoted, 'surgicalFactor') ?? mshlFactor;

  const rows: { key: keyof Payers; label: string; show: boolean }[] = [
    { key: 'mshl', label: t('rows.mshl'), show: !!mshlId },
    { key: 'plan', label: t('rows.plan'), show: !!planId },
    { key: 'rider', label: t('rows.rider'), show: withRider },
  ];

  return (
    <section
      aria-labelledby="ward-title"
      className="rise-in flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 shadow-1"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="label text-primary-hover">{t('eyebrow')}</span>
          <span className="flex flex-wrap gap-1">
            {['R-SG-005', 'R-SG-001', withRider ? 'R-SG-006' : undefined]
              .filter((id): id is string => !!id && trace.some((f) => f.ruleId === id))
              .map((id) => (
                <span
                  key={id}
                  className="rounded-sm border border-border bg-sunken px-1.5 py-0.5 font-mono text-[11px] text-muted"
                >
                  {id}
                </span>
              ))}
          </span>
        </div>
        <h3 id="ward-title" className="font-display text-lg font-bold leading-snug text-text">
          {t('title')}
        </h3>
      </div>

      <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-text">
        {planId && entitlement && (
          <li className="flex gap-2.5">
            <Icon name="shield" className="mt-0.5 text-lg text-primary-container" />
            <span>{t('entitlement', { ward: ward(entitlement) })}</span>
          </li>
        )}
        {planId &&
          rooms.map((o) => {
            const f = firing('R-SG-005', o.roomCategoryId, planId);
            const factor = num(f?.inputs, 'factor');
            const notClaimable = num(f?.output, 'notClaimable') ?? 0;
            const above = notClaimable > 0 && factor !== undefined;
            return (
              <li key={o.roomCategoryId} className="flex gap-2.5">
                <Icon
                  name={above ? 'trending_up' : 'check_circle'}
                  fill={!above}
                  className={cn('mt-0.5 text-lg', above ? 'text-gap' : 'text-safe')}
                />
                <span>
                  {above
                    ? t('above', {
                        room: o.label,
                        percent: percent(factor),
                        amount: money(notClaimable),
                      })
                    : t('within', { room: o.label })}
                </span>
              </li>
            );
          })}
        {mshlFactor !== undefined && mshlFactor < 1 && (
          <li className="flex gap-2.5 text-muted">
            <Icon name="info" className="mt-0.5 text-lg" />
            <span>
              {t('mshl', {
                room: quoted.label,
                wardShare: percent(mshlFactor),
                surgicalShare: percent(mshlSurgical ?? mshlFactor),
              })}
            </span>
          </li>
        )}
      </ul>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full table-fixed border-collapse text-sm">
          <caption className="sr-only">{t('payer')}</caption>
          <thead className="bg-sunken">
            <tr>
              <th scope="col" className={cn('w-[36%] py-2.5 text-left align-bottom', cell)}>
                <span className="text-xs font-semibold text-muted">{t('payer')}</span>
              </th>
              {columns.map(({ option }) => {
                const pick = option.roomCategoryId === result.recommendedRoomCategoryId;
                return (
                  <th
                    key={option.roomCategoryId}
                    scope="col"
                    className={cn('py-2.5 text-right align-bottom', cell)}
                  >
                    <span
                      className={cn(
                        'mb-1 inline-flex max-w-full items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-bold leading-tight',
                        pick ? 'bg-safe text-white' : 'bg-surface text-muted',
                      )}
                    >
                      <Icon
                        name={pick ? 'verified' : 'receipt_long'}
                        fill={pick}
                        className="hidden text-sm sm:inline"
                      />
                      {pick ? t('pick') : t('quoted')}
                    </span>
                    <span className="block text-xs font-bold leading-snug text-text">
                      {option.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows
              .filter((r) => r.show)
              .map((r) => (
                <tr key={r.key}>
                  <th scope="row" className={cn('py-2 text-left font-medium text-muted', cell)}>
                    {r.label}
                  </th>
                  {columns.map(({ option, payers: p }) => (
                    <td
                      key={option.roomCategoryId}
                      className={cn('py-2 text-right text-text', cell)}
                    >
                      {p[r.key] !== undefined ? <Amount value={p[r.key]!} /> : '–'}
                    </td>
                  ))}
                </tr>
              ))}
            <tr className="bg-sunken">
              <th scope="row" className={cn('py-2.5 text-left font-bold text-text', cell)}>
                {t('rows.family')}
              </th>
              {columns.map(({ option, payers: p }) => {
                const pick = option.roomCategoryId === result.recommendedRoomCategoryId;
                return (
                  <td key={option.roomCategoryId} className={cn('py-2.5 text-right', cell)}>
                    <Amount
                      value={p.family}
                      className={cn(
                        'font-display text-sm font-extrabold sm:text-base',
                        pick ? 'text-safe' : 'text-gap',
                      )}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="flex gap-1.5 text-xs text-muted">
        <Icon name="savings" className="text-sm" />
        {t('medisave')}
      </p>
    </section>
  );
}
