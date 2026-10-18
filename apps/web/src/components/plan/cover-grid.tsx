'use client';

import type { CoverCell, CoverMap, Household, Risk } from '@kavach/schemas';
import { Bandage, HeartPulse, type LucideIcon, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Amount } from '@/components/kavach/amount';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/components/ui/cn';

const RISKS: Risk[] = ['health', 'life', 'accident'];
const RISK_ICON: Record<Risk, LucideIcon> = { health: HeartPulse, life: Users, accident: Bandage };

/**
 * S09 cover map: members × risks, each cell a status. Columns where nothing applies are hidden.
 * On a laptop each short cell also says how much is missing.
 */
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
  const tc = useTranslations('common');
  const shown = risks.filter((risk) => map.cells.some((c) => c.risk === risk && c.status !== 'na'));
  const cell = (memberId: string, risk: Risk) =>
    map.cells.find((c) => c.memberId === memberId && c.risk === risk);
  const short = (c: CoverCell) =>
    Math.max(0, c.need - (c.have.employer + c.have.personal + c.have.statutory));

  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {/* A ruled table (Stitch 06): a labelled header row, a hairline between members. */}
      <table className="w-full min-w-[19rem] table-fixed border-collapse text-sm">
        <caption className="sr-only">{t('home.mapCaption')}</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted [&:lang(ta)]:tracking-normal [&:lang(zh)]:tracking-normal">
            <th scope="col" className="w-[27%] pb-2 font-semibold sm:w-[26%]">
              <span className="sr-only sm:not-sr-only">{t('home.member')}</span>
            </th>
            {shown.map((risk) => {
              const Icon = RISK_ICON[risk];
              return (
                <th key={risk} scope="col" className="pb-2 pl-1.5 font-semibold">
                  <span className="inline-flex min-w-0 items-center gap-1 leading-tight [overflow-wrap:anywhere]">
                    <Icon aria-hidden className="size-3.5 shrink-0" />
                    {t(`risk.${risk}`)}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {household.members.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-b-0">
              <th scope="row" className="py-2 pr-1 text-left font-semibold">
                <span className="flex items-center gap-2">
                  <MemberAvatar member={member} className="hidden size-8 text-xs sm:inline-flex" />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate">{member.name.split(' ')[0]}</span>
                    <span
                      className="truncate text-xs font-normal text-muted"
                      title={`${tc(`relation.${member.relation}`)} · ${member.age}`}
                    >
                      {tc(`relation.${member.relation}`)} · {member.age}
                    </span>
                  </span>
                </span>
              </th>
              {shown.map((risk) => {
                const c = cell(member.id, risk);
                if (!c) return <td key={risk} className="py-2" />;
                const missing = c.status === 'na' ? 0 : short(c);
                return (
                  <td key={risk} className="py-2 pl-1.5 align-middle">
                    <motion.button
                      layout
                      key={c.status}
                      initial={{ scale: 0.94, opacity: 0.3 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                      onClick={() => onSelect?.(c)}
                      disabled={c.status === 'na' || !onSelect}
                      aria-label={`${member.name}, ${t(`risk.${risk}`)}`}
                      className={cn(
                        'press flex min-h-13 w-full flex-col items-start justify-center gap-0.5 rounded-md text-left',
                        c.status !== 'na' &&
                          'hover:ring-2 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-primary',
                        pulseGaps && c.status === 'gap' && 'animate-pulse',
                      )}
                    >
                      <StatusBadge
                        status={c.status}
                        short
                        className="w-full min-w-0 px-1.5 text-[11px] leading-tight sm:hidden"
                      />
                      <StatusBadge
                        status={c.status}
                        className="hidden w-full text-xs leading-tight sm:inline-flex"
                      />
                      {missing > 0 && (
                        <span className="hidden px-1 text-xs font-medium text-muted lg:block">
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
