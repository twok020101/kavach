'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import { Briefcase, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { buttonClasses } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from '@/i18n/navigation';
import { useDate } from './format';
import { RuleList } from './rule-list';

const LAYERS = ['employer', 'personal', 'statutory'] as const;

/**
 * S10: what a member needs for one risk, what they have by layer, and why. Laid out like the
 * Stitch inspector: Needs / Has side by side on a sunken strip, one sunken tile per policy under
 * its layer, the fix as a full-width button, the Why disclosure last.
 */
export function CellDetail({
  household,
  cell,
  showStatus = true,
}: {
  household: Household;
  cell: CoverCell;
  /** Off when the caller already shows the status next to the title (the laptop inspector). */
  showStatus?: boolean;
}) {
  const t = useTranslations('plan');
  const date = useDate();
  const policies = household.policies.filter((p) => cell.policyIds.includes(p.id));
  const holder = (id: string) => household.members.find((m) => m.id === id)?.name ?? '';

  return (
    <div className="flex flex-col gap-4">
      {showStatus && <StatusBadge status={cell.status} className="self-start" />}
      <dl className="grid grid-cols-2 gap-x-4 rounded-md bg-sunken px-4 py-3">
        {/* Label over the figure on a phone; label and figure on one line where there is room. */}
        <div className="flex flex-col gap-0.5 border-r border-border pr-4 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
          <dt className="text-sm text-muted sm:text-base">{t('cell.needs')}</dt>
          <dd className="font-display text-lg font-bold">
            <Amount value={cell.need} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
          <dt className="text-sm text-muted sm:text-base">{t('cell.has')}</dt>
          <dd className="font-display text-lg font-bold">
            <Amount value={cell.have.employer + cell.have.personal + cell.have.statutory} />
          </dd>
        </div>
      </dl>

      {LAYERS.map((layer) => {
        const inLayer = policies.filter((p) =>
          layer === 'employer'
            ? p.source === 'employer'
            : layer === 'personal' && p.source === 'personal',
        );
        if (inLayer.length === 0) return null;
        return (
          <section key={layer} className="flex flex-col gap-1.5">
            <h3 className="label">{t(`layer.${layer}`)}</h3>
            {inLayer.map((p) => (
              <div key={p.id} className="rounded-md border border-border bg-sunken p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-display font-semibold">{p.productName}</span>
                  <Amount value={p.sumInsured} className="font-semibold" />
                </div>
                {p.source === 'employer' && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-partial">
                    <Briefcase aria-hidden className="mt-0.5 size-4 shrink-0" />
                    {t('cell.endsWithJob', {
                      name: holder(p.holderMemberId),
                      date: date(p.endDate, true),
                    })}
                  </p>
                )}
                {p.kind === 'super_top_up' && (
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                    <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      {t.rich('cell.topUpAbove', {
                        amount: () => <Amount value={p.terms.deductible} />,
                      })}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </section>
        );
      })}

      {cell.issues.map((issue) => (
        <p key={issue} className="panel panel-partial text-sm text-partial">
          {t(`issue.${issue}`)}
        </p>
      ))}
      {cell.status === 'gap' && cell.issues.length === 0 && policies.length === 0 && (
        <p className="panel panel-gap text-sm text-gap">{t('cell.nothing')}</p>
      )}

      <Link href="/plan" className={buttonClasses({ variant: 'secondary', className: 'w-full' })}>
        {t('cell.seeFix')}
      </Link>

      {cell.ruleIds.length > 0 && (
        <Disclosure label={t('why')}>
          <RuleList ids={cell.ruleIds} />
        </Disclosure>
      )}
    </div>
  );
}
