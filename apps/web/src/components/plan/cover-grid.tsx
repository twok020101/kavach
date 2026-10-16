'use client';

import type { CoverCell, CoverMap, Household, Risk } from '@kavach/schemas';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/components/ui/cn';

const RISKS: Risk[] = ['health', 'life', 'accident'];

/** S09 cover map: members × risks, each cell a status. Columns where nothing applies are hidden. */
export function CoverGrid({
  household,
  map,
  risks = RISKS,
  pulseGaps = false,
  onSelect,
}: {
  household: Household;
  map: CoverMap;
  risks?: Risk[];
  /** Pulse cells with no cover, to draw the eye after a change (S19). */
  pulseGaps?: boolean;
  onSelect?: (cell: CoverCell) => void;
}) {
  const t = useTranslations('plan');
  const shown = risks.filter((risk) => map.cells.some((c) => c.risk === risk && c.status !== 'na'));
  const cell = (memberId: string, risk: Risk) =>
    map.cells.find((c) => c.memberId === memberId && c.risk === risk);

  return (
    <table className="w-full table-fixed border-separate border-spacing-y-1.5 text-sm">
      <caption className="sr-only">{t('home.mapCaption')}</caption>
      <thead>
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
          <th scope="col" className="w-[24%] pb-1">
            <span className="sr-only">{t('home.member')}</span>
          </th>
          {shown.map((risk) => (
            <th key={risk} scope="col" className="pb-1 pl-1">
              {t(`risk.${risk}`)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {household.members.map((member) => (
          <tr key={member.id}>
            <th scope="row" className="truncate pr-1 text-left font-semibold">
              {member.name}
            </th>
            {shown.map((risk) => {
              const c = cell(member.id, risk);
              if (!c) return <td key={risk} />;
              return (
                <td key={risk} className="pl-1">
                  <motion.button
                    layout
                    key={c.status}
                    initial={{ scale: 0.92, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => onSelect?.(c)}
                    disabled={c.status === 'na' || !onSelect}
                    aria-label={`${member.name}, ${t(`risk.${risk}`)}`}
                    className={cn(
                      'flex min-h-12 w-full items-center rounded-md text-left',
                      c.status !== 'na' && 'hover:ring-2 hover:ring-primary/40',
                      pulseGaps && c.status === 'gap' && 'animate-pulse',
                    )}
                  >
                    <StatusBadge status={c.status} className="w-full text-xs leading-tight" />
                  </motion.button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
