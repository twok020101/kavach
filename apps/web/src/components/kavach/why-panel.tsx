'use client';

import type { BranchResult, DeskEvaluation, HospitalEstimate } from '@kavach/schemas';
import { ArrowDownUp, GitBranch } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '../ui/cn';
import { Amount } from './amount';
import { CitationChip } from './citation-chip';
import { RuleId, VerifiedBadge } from './verified-badge';

/**
 * Why these numbers: the tariff columns that drove the deduction, the other billing
 * branch ("₹16,000 if the hospital doesn't price by room") and every rule that fired.
 */
export function WhyPanel({
  evaluation,
  estimate,
}: {
  evaluation: DeskEvaluation;
  estimate?: HospitalEstimate;
}) {
  const t = useTranslations('common.why');
  return (
    <div className="flex flex-col gap-5">
      {estimate && <TariffTable estimate={estimate} />}
      {evaluation.alternate && <BranchNote branch={evaluation.alternate} />}

      <section aria-labelledby="why-rules">
        <h4 id="why-rules" className="mb-2 font-display text-lg font-bold">
          {t('rulesTitle')}
        </h4>
        <ol className="flex flex-col gap-3">
          {evaluation.trace.map((firing) => (
            <li key={firing.ruleId} className="rounded-md border border-border bg-surface p-3">
              <div className="flex flex-wrap items-center gap-2">
                <RuleId id={firing.ruleId} />
                <VerifiedBadge verified={firing.status === 'verified'} />
              </div>
              <p className="mt-2">{firing.statement}</p>
              {firing.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {firing.sources.map((s) => (
                    <CitationChip key={s.title} label={s.title} href={s.url} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function TariffTable({ estimate }: { estimate: HospitalEstimate }) {
  const t = useTranslations('common.why');
  const heads = useTranslations('common.heads');
  return (
    <section aria-labelledby="why-tariff">
      <h4 id="why-tariff" className="font-display text-lg font-bold">
        {t('tariffTitle')}
      </h4>
      <p className="text-muted">{t('tariffIntro')}</p>
      <p className="mb-2 mt-1 flex items-center gap-1 text-sm font-semibold text-primary-hover">
        <span className="inline-flex items-center gap-1 rounded-sm bg-primary-soft px-1.5 py-0.5">
          <ArrowDownUp aria-hidden className="size-4" />
          {t('changesWithRoom')}
        </span>
      </p>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-sunken text-left">
            <tr>
              <th scope="col" className="p-2 font-semibold">
                {t('charge')}
              </th>
              {estimate.roomCategories.map((room) => (
                <th key={room.id} scope="col" className="p-2 text-right font-semibold">
                  <Amount value={room.rentPerDay} />
                  <span className="block font-normal text-muted">{room.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {estimate.lines.map((line) => {
              const cut = line.pricedByRoom && line.head !== 'room';
              return (
                <tr
                  key={line.head + line.label}
                  className={cn('border-t border-border', cut && 'bg-primary-soft')}
                >
                  <th scope="row" className="p-2 text-left font-normal">
                    {heads.has(line.head) ? heads(line.head) : line.label}
                    {cut && (
                      <>
                        <ArrowDownUp
                          aria-hidden
                          className="ml-1 inline size-4 align-[-2px] text-primary-hover"
                        />
                        <span className="sr-only"> ({t('changesWithRoom')})</span>
                      </>
                    )}
                  </th>
                  {estimate.roomCategories.map((room) => (
                    <td key={room.id} className="p-2 text-right align-top">
                      <Amount value={line.amounts[room.id] ?? 0} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BranchNote({ branch }: { branch: BranchResult }) {
  const t = useTranslations('common.why');
  return (
    <section
      aria-labelledby="why-branch"
      className="rounded-md border-l-4 border-primary bg-citation-bg p-3"
    >
      <h4 id="why-branch" className="flex items-start gap-2 font-semibold">
        <GitBranch aria-hidden className="mt-1 size-5 shrink-0 text-primary" />
        <span>
          {t.rich('branchTitle', {
            amount: () => <Amount value={branch.saving} className="font-bold" />,
          })}
        </span>
      </h4>
      <p className="mt-1 text-muted">{t('branchBody')}</p>
      <ul className="mt-2 flex flex-col gap-1">
        {branch.options.map((o) => (
          <li key={o.roomCategoryId} className="flex justify-between gap-4">
            <span>
              <Amount value={o.rentPerDay} /> {o.label}
            </span>
            <Amount value={o.outOfPocket} className="font-semibold" />
          </li>
        ))}
      </ul>
    </section>
  );
}
