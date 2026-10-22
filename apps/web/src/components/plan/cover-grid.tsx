'use client';

import type { CoverCell, CoverMap, Household, Risk } from '@kavach/schemas';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { cn } from '@/components/ui/cn';
import { STATUS_LOOK } from './status-pill';

const RISKS: Risk[] = ['health', 'life', 'accident'];
const RISK_ICON: Record<Risk, string> = {
  health: 'favorite',
  life: 'shield_person',
  accident: 'airline_seat_flat',
};

/**
 * S09 cover map, as the Stitch matrix: members × risks under a caps header, each cell a tinted
 * pill with an icon and a word, and on wider screens how much is missing under it. Columns where
 * nothing applies are hidden. On a phone the cells use the one-word status.
 */
export function CoverGrid({
  household,
  map,
  risks = RISKS,
  pulseGaps = false,
  selected,
  onSelect,
}: {
  household: Household;
  map: CoverMap;
  risks?: Risk[];
  /** Pulse cells with no cover, to draw the eye after a change (S19). */
  pulseGaps?: boolean;
  /** The cell open in the inspector, ringed. */
  selected?: Pick<CoverCell, 'memberId' | 'risk'>;
  onSelect?: (cell: CoverCell) => void;
}) {
  const t = useTranslations('plan');
  const tc = useTranslations('common');
  const shown = risks.filter((risk) => map.cells.some((c) => c.risk === risk && c.status !== 'na'));
  const cell = (memberId: string, risk: Risk) =>
    map.cells.find((c) => c.memberId === memberId && c.risk === risk);
  const short = (c: CoverCell) =>
    Math.max(0, c.need - (c.have.employer + c.have.personal + c.have.statutory));

  return (
    <div className="-mx-1 sm:mx-0">
      <table className="w-full table-fixed border-collapse text-left">
        <caption className="sr-only">{t('home.mapCaption')}</caption>
        <thead>
          <tr className="border-b border-border text-label-caps uppercase text-on-surface-variant [&:lang(hi)]:normal-case [&:lang(hi)]:tracking-normal">
            <th scope="col" className="w-[28%] px-1 py-2.5 font-semibold sm:w-[26%] sm:px-2">
              <span className="sr-only sm:not-sr-only">{t('home.member')}</span>
            </th>
            {shown.map((risk) => (
              <th key={risk} scope="col" className="px-1 py-2.5 text-center font-semibold sm:px-2">
                {/* Phone: the icon over the word, so ACCIDENT keeps to one line. */}
                <span className="inline-flex min-w-0 flex-col items-center justify-center gap-0.5 leading-tight [overflow-wrap:anywhere] min-[420px]:flex-row min-[420px]:gap-1">
                  <Icon name={RISK_ICON[risk]} className="text-base" />
                  {t(`risk.${risk}`)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {household.members.map((member) => (
            <tr
              key={member.id}
              className="border-b border-border/70 transition-colors last:border-b-0 hover:bg-surface-container-low/50"
            >
              <th scope="row" className="px-1 py-3 text-left font-normal sm:px-2">
                <span className="flex items-center gap-2.5">
                  <MemberAvatar
                    member={member}
                    className="hidden size-8 text-sm font-semibold sm:inline-flex"
                  />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-display text-body-md font-semibold text-on-surface sm:text-title-md">
                      {member.name.split(' ')[0]}
                    </span>
                    <span
                      className="truncate font-serif text-citation-sm text-on-surface-variant"
                      title={`${tc(`relation.${member.relation}`)} · ${member.age}`}
                    >
                      {tc(`relation.${member.relation}`)} · {member.age}
                    </span>
                  </span>
                </span>
              </th>
              {shown.map((risk) => {
                const c = cell(member.id, risk);
                if (!c) return <td key={risk} className="py-3" />;
                if (c.status === 'na') {
                  return (
                    <td key={risk} className="px-1 py-3 text-center sm:px-2">
                      <span className="inline-flex items-center rounded-sm bg-surface-container-low px-2 py-1 font-serif text-citation-sm text-on-surface-variant">
                        <span aria-hidden className="sm:hidden">
                          –
                        </span>
                        <span className="max-sm:sr-only">— {tc('status.na')}</span>
                      </span>
                    </td>
                  );
                }
                const missing = short(c);
                const look = STATUS_LOOK[c.status];
                const isSelected = selected?.memberId === c.memberId && selected.risk === c.risk;
                return (
                  <td key={risk} className="px-1 py-3 text-center align-middle sm:px-2">
                    <motion.button
                      type="button"
                      key={c.status}
                      initial={{ scale: 0.94, opacity: 0.3 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                      onClick={() => onSelect?.(c)}
                      disabled={!onSelect}
                      aria-label={`${member.name}, ${t(`risk.${risk}`)}: ${tc(`status.${c.status}`)}`}
                      aria-pressed={onSelect ? isSelected : undefined}
                      className={cn(
                        'press inline-flex min-h-12 w-full max-w-44 flex-col items-center justify-center gap-0.5 rounded-md border px-1.5 py-1.5 shadow-1 sm:px-3',
                        look.tone,
                        onSelect &&
                          'transition-shadow hover:shadow-hover focus-visible:ring-2 focus-visible:ring-primary',
                        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
                        pulseGaps && c.status === 'gap' && 'animate-pulse',
                      )}
                    >
                      <span className="flex min-w-0 items-center justify-center gap-1 text-xs font-medium leading-tight sm:text-body-sm">
                        <Icon name={look.icon} className="text-sm sm:text-[15px]" />
                        <span aria-hidden className="min-w-0 [overflow-wrap:anywhere] sm:hidden">
                          {tc(`statusShort.${c.status}`)}
                        </span>
                        <span className="hidden min-w-0 [overflow-wrap:anywhere] sm:inline">
                          {tc(`status.${c.status}`)}
                        </span>
                      </span>
                      {missing > 0 && (
                        <span className="hidden font-serif text-citation-sm font-semibold lg:block">
                          {t.rich('home.short', {
                            amount: () => <Amount value={missing} />,
                          })}
                        </span>
                      )}
                    </motion.button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
