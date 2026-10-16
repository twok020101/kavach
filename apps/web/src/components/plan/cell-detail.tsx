'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import { Briefcase } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { buttonClasses } from '@/components/ui/button';
import { Disclosure } from '@/components/ui/disclosure';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from '@/i18n/navigation';
import { useDate } from './format';
import { RuleList } from './rule-list';

const LAYERS = ['employer', 'personal', 'statutory'] as const;

/** S10: what a member needs for one risk, what they have by layer, and why. */
export function CellDetail({ household, cell }: { household: Household; cell: CoverCell }) {
  const t = useTranslations('plan');
  const date = useDate();
  const policies = household.policies.filter((p) => cell.policyIds.includes(p.id));
  const holder = (id: string) => household.members.find((m) => m.id === id)?.name ?? '';

  return (
    <div className="flex flex-col gap-4">
      <StatusBadge status={cell.status} className="self-start" />
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted">{t('cell.needs')}</dt>
        <dd className="text-right font-semibold">
          <Amount value={cell.need} />
        </dd>
        <dt className="text-muted">{t('cell.has')}</dt>
        <dd className="text-right font-semibold">
          <Amount value={cell.have.employer + cell.have.personal + cell.have.statutory} />
        </dd>
      </dl>

      {LAYERS.map((layer) => {
        const inLayer = policies.filter((p) =>
          layer === 'employer' ? p.source === 'employer' : layer === 'personal' && p.source === 'personal',
        );
        if (inLayer.length === 0) return null;
        return (
          <section key={layer} className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {t(`layer.${layer}`)}
            </h3>
            {inLayer.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">{p.productName}</span>
                  <Amount value={p.sumInsured} className="text-sm" />
                </div>
                {p.source === 'employer' && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-partial">
                    <Briefcase aria-hidden className="size-4" />
                    {t('cell.endsWithJob', { name: holder(p.holderMemberId), date: date(p.endDate, true) })}
                  </p>
                )}
                {p.kind === 'super_top_up' && (
                  <p className="mt-1 text-sm text-muted">
                    {t.rich('cell.topUpAbove', {
                      amount: () => <Amount value={p.terms.deductible} />,
                    })}
                  </p>
                )}
              </div>
            ))}
          </section>
        );
      })}

      {cell.issues.map((issue) => (
        <p key={issue} className="rounded-md bg-partial-bg p-3 text-sm text-partial">
          {t(`issue.${issue}`)}
        </p>
      ))}
      {cell.status === 'gap' && cell.issues.length === 0 && policies.length === 0 && (
        <p className="rounded-md bg-gap-bg p-3 text-sm text-gap">{t('cell.nothing')}</p>
      )}

      <Link href="/plan" className={buttonClasses({ variant: 'secondary' })}>
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
