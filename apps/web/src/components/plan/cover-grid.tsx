'use client';

import type { CoverCell, CoverMap, Household, Risk } from '@kavach/schemas';
import {
  Bandage,
  Briefcase,
  CircleAlert,
  HeartPulse,
  type LucideIcon,
  Minus,
  ShieldCheck,
  ShieldHalf,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Amount } from '@/components/kavach/amount';
import { cn } from '@/components/ui/cn';

const RISKS: Risk[] = ['health', 'life', 'accident'];
const RISK_ICON: Record<Risk, LucideIcon> = { health: HeartPulse, life: Users, accident: Bandage };

/** Each status as a bordered pill (Stitch cover matrix): tint, icon and word together. */
const PILL: Record<CoverCell['status'], { icon: LucideIcon; className: string }> = {
  covered: { icon: ShieldCheck, className: 'border-safe/30 bg-safe-bg text-safe' },
  partial: { icon: ShieldHalf, className: 'border-partial/30 bg-partial-bg text-partial' },
  contingent: { icon: Briefcase, className: 'border-partial/30 bg-partial-bg text-partial' },
  gap: { icon: CircleAlert, className: 'border-gap/30 bg-gap-bg text-gap' },
  na: { icon: Minus, className: 'border-transparent bg-sunken text-muted' },
};

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
                <th key={risk} scope="col" className="pb-2 pl-1.5 text-center font-semibold">
                  <span className="inline-flex min-w-0 items-center justify-center gap-1 leading-tight [overflow-wrap:anywhere]">
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
                const { icon: Icon, className: tone } = PILL[c.status];
                const na = c.status === 'na';
                return (
                  <td key={risk} className="py-2 pl-1.5 text-center align-middle">
                    <motion.button
                      layout
                      key={c.status}
                      initial={{ scale: 0.94, opacity: 0.3 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                      onClick={() => onSelect?.(c)}
                      disabled={na || !onSelect}
                      aria-label={`${member.name}, ${t(`risk.${risk}`)}: ${tc(`status.${c.status}`)}`}
                      className={cn(
                        'press group flex min-h-12 w-full items-center justify-center rounded-md',
                        !na && 'focus-visible:outline-none',
                        pulseGaps && c.status === 'gap' && 'animate-pulse',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'inline-flex min-w-0 max-w-full flex-col items-center gap-0.5 rounded-sm border px-1.5 py-1 leading-tight sm:px-3 sm:py-1.5',
                          tone,
                          !na &&
                            'shadow-1 group-hover:ring-2 group-hover:ring-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-primary',
                          na && 'shadow-none',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex min-w-0 items-center gap-1 font-medium [overflow-wrap:anywhere]',
                            na ? 'text-xs' : 'text-[11px] sm:text-sm',
                          )}
                        >
                          <Icon className="hidden size-3.5 shrink-0 sm:block" />
                          <span className="sm:hidden">{tc(`statusShort.${c.status}`)}</span>
                          <span className="hidden sm:inline">{tc(`status.${c.status}`)}</span>
                        </span>
                        {missing > 0 && (
                          <span className="hidden text-xs font-semibold lg:block">
                            {t.rich('home.short', {
                              amount: () => <Amount value={missing} />,
                            })}
                          </span>
                        )}
                      </span>
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
