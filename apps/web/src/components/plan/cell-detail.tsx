'use client';

import type { CoverCell, Household } from '@kavach/schemas';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { useDate } from './format';
import { RuleList } from './rule-list';
import { StatusPill } from './status-pill';

const LAYERS = ['employer', 'personal', 'statutory'] as const;

/**
 * S10: what a member needs for one risk, what they have by layer, and why. Laid out like the
 * Stitch inspector: Needs / Has side by side on a tinted strip, one tile per policy under its
 * layer, the fix as a full-width outline button, "How we worked this out" last.
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
  const holder = (id: string) =>
    household.members.find((m) => m.id === id)?.name.split(' ')[0] ?? '';

  return (
    <div className="flex flex-col gap-4">
      {showStatus && <StatusPill status={cell.status} className="self-start" />}
      <dl className="grid grid-cols-2 gap-x-4 rounded-md bg-surface-container-low p-4">
        {/* Label over the figure on a phone; label and figure on one line where there is room. */}
        <div className="flex flex-col gap-0.5 border-r border-outline-variant/40 pr-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3">
          <dt className="text-body-md text-on-surface-variant">{t('cell.needs')}</dt>
          <dd className="text-numeral-md font-semibold text-on-surface">
            <Amount value={cell.need} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:pl-1">
          <dt className="text-body-md text-on-surface-variant">{t('cell.has')}</dt>
          <dd className="text-numeral-md font-semibold text-on-surface">
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
            <h3 className="text-label-caps uppercase text-on-surface-variant [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal">
              {t(`layer.${layer}`)}
            </h3>
            {inLayer.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-1 rounded-md border border-outline-variant/30 bg-surface-container-low/70 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="font-display text-title-md text-on-surface">
                    {p.productName}
                  </span>
                  <Amount value={p.sumInsured} className="text-numeral-md font-semibold" />
                </div>
                {p.source === 'employer' && (
                  <p className="flex items-start gap-1.5 font-serif text-citation-sm text-secondary">
                    <Icon name="work_history" className="mt-px text-[15px]" />
                    {t('cell.endsWithJob', {
                      name: holder(p.holderMemberId),
                      date: date(p.endDate, true),
                    })}
                  </p>
                )}
                {p.kind === 'super_top_up' && (
                  <p className="flex items-start gap-1.5 font-serif text-citation-sm text-on-surface-variant">
                    <Icon name="info" className="mt-px text-[15px]" />
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
        <p
          key={issue}
          className="flex items-start gap-2 rounded-md border border-partial/20 bg-partial-bg p-3 text-body-sm text-partial"
        >
          <Icon name="warning" className="mt-px text-base" />
          {t(`issue.${issue}`)}
        </p>
      ))}
      {cell.status === 'gap' && cell.issues.length === 0 && policies.length === 0 && (
        <p className="flex items-start gap-2 rounded-md border border-gap/20 bg-gap-bg p-3 text-body-sm text-gap">
          <Icon name="error" className="mt-px text-base" />
          {t('cell.nothing')}
        </p>
      )}

      <div className="flex flex-col gap-1 pt-1">
        <Link
          href="/plan"
          className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-primary px-4 py-2.5 text-center font-display text-title-md text-primary transition-colors hover:bg-primary hover:text-on-primary"
        >
          {t('cell.seeFix')}
        </Link>
        {cell.ruleIds.length > 0 && <Why label={t('why')} ids={cell.ruleIds} />}
      </div>
    </div>
  );
}

/** "How we worked this out": a centred serif link that opens the engine rules underneath. */
function Why({ label, ids }: { label: string; ids: string[] }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="press mx-auto flex min-h-12 items-center justify-center gap-1 rounded-md px-3 font-serif text-citation-md text-primary hover:bg-surface-container-low"
      >
        {label}
        <Icon
          name="expand_more"
          className={cn(
            'text-lg transition-transform duration-200 ease-[var(--ease-out-strong)]',
            open && 'rotate-180',
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <RuleList ids={ids} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
