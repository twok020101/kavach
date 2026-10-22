import type { Country } from '@kavach/engine';
import type { CSSProperties, ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { Spotlit, WordsRise } from '@/components/kavach/landing-live';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { landingNumbers } from '@/lib/mock/landing';
import type { LandingCase } from './data';
import { landingT } from './market-t';

/** Entrance order of the opening section once the gateway lifts. */
const rise = (i: number) => ({ '--i': i }) as CSSProperties;

/** Each market's sample family, in the order the audit card shows them. */
const FAMILY: Record<Country, string[]> = {
  IN: ['Rahul', 'Priya', 'Anaya', 'Suresh', 'Kamala'],
  SG: ['Wei-Ming', 'Hui-Ling', 'Jia-En', 'Ah Kow', 'Siew-Hong'],
};
/** The rules the audit card's comparison rests on. */
const AUDIT_RULES: Record<Country, string> = {
  IN: 'R-HL-001 · R-MG-001',
  SG: 'R-SG-005 · R-SG-006',
};
const TINTS = [
  'bg-primary-soft text-primary-hover',
  'bg-primary-soft text-primary-hover',
  'bg-safe-bg text-safe',
  'bg-partial-bg text-partial',
  'bg-partial-bg text-partial',
];

/**
 * The opening section (Stitch hero): the statement with its marigold second line, the two ways
 * in, the stat ribbon and, on the right, the engine's own check of the sample household: the
 * Sharmas in India, or the Tans in Singapore (S$, MediShield Life and a Shield plan).
 */
export async function Hero({
  market,
  admission,
  wordings,
}: {
  market: Country;
  admission: LandingCase;
  wordings?: number;
}) {
  const t = await landingT('hero', market);
  const sg = market === 'SG';
  const scene = { pathname: '/desk', query: { demo: '1', ...(sg ? { scene: 'singapore' } : {}) } };
  // The second scene: Priya's delivery in India; from Singapore, the India desk.
  const other = sg
    ? { href: { pathname: '/desk', query: { demo: '1' } }, icon: 'travel_explore' }
    : {
        href: { pathname: '/desk', query: { demo: '1', scene: 'maternity' } },
        icon: 'pregnant_woman',
      };
  return (
    <Spotlit className="relative bg-surface-container-low px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-12">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <p
            className="rise inline-flex w-fit items-center gap-2 rounded-xl bg-surface px-3 py-1.5 shadow-1 sm:rounded-full"
            style={rise(0)}
          >
            <Icon name="verified_user" className="text-base text-safe" />
            <span className="text-label-caps uppercase text-on-surface">{t('chip')}</span>
          </p>
          <WordsRise
            text={t('title')}
            emphasis={t('titleEm')}
            emphasisClassName="text-secondary"
            emphasisBlock
            className="font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.02em] text-primary sm:text-headline-xl lg:text-[3rem] lg:leading-[1.12] lg:[&:lang(zh)]:text-[2.75rem]"
          />
          <p className="rise max-w-2xl text-body-lg text-on-surface-variant" style={rise(3)}>
            {t('lead')}
          </p>

          {/* On a phone both ways in take the full width; a long label lets its chip drop under it
              instead of squeezing both into a narrow column (Malay, Tamil). */}
          <div
            className="rise flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center"
            style={rise(4)}
          >
            <Link
              href={scene}
              className="btn-solid flex min-h-14 items-center gap-2.5 rounded-md bg-primary px-5 py-2.5 text-title-md font-bold text-on-primary shadow-2 hover:bg-primary-hover"
            >
              <Icon name="bolt" className="text-xl" />
              <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                {t('tryHospital')}
                <span className="whitespace-nowrap rounded-sm bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-primary">
                  {t('tryHospitalChip')}
                </span>
              </span>
            </Link>
            <Link
              href="/demo"
              className="lift flex min-h-14 items-center gap-2 rounded-md bg-surface px-5 py-2.5 text-title-md text-primary shadow-1 hover:bg-surface-container"
            >
              <Icon name="family_restroom" className="text-xl text-secondary" />
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {t('explore')}
                <span className="whitespace-nowrap rounded-sm bg-accent-soft px-2 py-0.5 text-label-caps font-bold uppercase text-partial">
                  {t('exploreChip')}
                </span>
              </span>
            </Link>
          </div>
          <Link
            href={other.href}
            className="rise -mt-2 inline-flex min-h-11 w-fit items-center gap-1.5 text-body-md font-semibold text-primary underline-offset-4 hover:underline"
            style={rise(5)}
          >
            <Icon name={other.icon} className="text-lg" />
            <span>
              {t('maternity')}
              <Icon name="arrow_forward" className="ml-1.5 align-[-0.2em] text-base" />
            </span>
          </Link>

          {/* Singapore has three figures: on a phone the third takes the full row, not half of it. */}
          <ul
            aria-label={t('statsLabel')}
            className={cn(
              'rise grid grid-cols-2 gap-3 pt-2 sm:gap-4',
              sg
                ? 'sm:grid-cols-3 max-sm:[&>li:last-child:nth-child(odd)]:col-span-2'
                : 'sm:grid-cols-4',
            )}
            style={rise(6)}
          >
            <Stat
              icon="savings"
              tone="text-safe"
              value={<Amount value={admission.saving} />}
              caption={t('stats.desk')}
            />
            {sg ? (
              <Stat
                icon="bed"
                tone="text-primary"
                value={<Amount value={admission.pick.outOfPocket} />}
                caption={t('stats.pick')}
              />
            ) : (
              <Stat
                icon="gavel"
                tone="text-primary"
                value={<Amount value={landingNumbers.claimRecoverable} />}
                caption={t('stats.claim')}
              />
            )}
            {!sg && wordings !== undefined && (
              <Stat
                icon="menu_book"
                tone="text-secondary"
                value={wordings}
                caption={t('stats.wordings')}
              />
            )}
            <Stat
              icon="rule"
              tone="text-primary"
              value={admission.rulesCount}
              caption={t('stats.rules')}
            />
          </ul>
        </div>

        <LiveAudit market={market} admission={admission} />
      </div>
    </Spotlit>
  );
}

function Stat({
  icon,
  tone,
  value,
  caption,
}: {
  icon: string;
  tone: string;
  value: ReactNode;
  caption: string;
}) {
  return (
    <li className="lift rounded-md bg-surface p-3.5 shadow-1">
      <span className={cn('flex items-center gap-1.5 font-display text-lg font-bold', tone)}>
        <Icon name={icon} className="text-base" />
        {value}
      </span>
      <span className="mt-0.5 block font-serif text-citation-sm text-on-surface-variant">
        {caption}
      </span>
    </li>
  );
}

/** The right-hand card: what the engine found in the sample household, with a live ping. */
async function LiveAudit({ market, admission: a }: { market: Country; admission: LandingCase }) {
  const t = await landingT('audit', market);
  const pickShare = Math.round((a.pick.outOfPocket / a.quoted.outOfPocket) * 100);
  return (
    <aside
      aria-labelledby="audit-title"
      className="rise lift w-full shrink-0 rounded-xl bg-surface p-5 shadow-2 sm:p-6 lg:w-[25rem]"
      style={rise(4)}
    >
      <div className="flex items-center justify-between gap-3 pb-4">
        <span className="flex items-center gap-2">
          <span className="live-dot" style={{ '--live': 'var(--accent)' } as CSSProperties} />
          <span className="text-label-caps font-bold uppercase text-on-surface-variant">
            {t('chip')}
          </span>
        </span>
        <span className="font-serif text-citation-sm font-semibold text-primary">{t('city')}</span>
      </div>

      <div className="flex flex-col gap-4 rounded-lg bg-surface-container-low p-4">
        {/* The status chip moves under the name when the line gets long (Tamil, Malay). */}
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-1 basis-44">
            <h2 id="audit-title" className="font-display text-title-md font-bold">
              {t('household')}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              {t('people', {
                count: landingNumbers.familyMembers,
                age: a.patient.age,
                policies: a.policiesForPatient,
              })}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-sm bg-partial-bg px-2 py-1 text-xs font-bold text-partial">
            <Icon name="priority_high" className="text-sm" />
            {t('status')}
          </span>
        </div>

        <ul className="flex -space-x-2" aria-label={t('household')}>
          {FAMILY[market].map((name, i) => (
            <li
              key={name}
              title={name}
              className={cn(
                'flex size-9 items-center justify-center rounded-full font-display text-sm font-bold ring-2 ring-surface-container-low',
                TINTS[i],
              )}
            >
              <span aria-hidden>{name.charAt(0)}</span>
              <span className="sr-only">{name}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-semibold text-on-surface-variant">
            {t('compareTitle', { hospital: a.hospital })}
          </p>
          <Bar
            label={t('quoted', { room: a.quoted.label })}
            value={a.quoted.outOfPocket}
            share={100}
            tone="gap"
          />
          <Bar
            label={t('within', { room: a.pick.label })}
            value={a.pick.outOfPocket}
            share={pickShare}
            tone="safe"
          />
        </div>

        <div className="flex flex-col gap-1 rounded-sm bg-surface p-3 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-partial">
            <Icon name="warning" className="text-sm" />
            {t('warnTitle')}
          </p>
          <p className="font-serif text-citation-sm text-on-surface-variant">{t('warnBody')}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-primary">
        <span className="flex items-center gap-1">
          <Icon name="menu_book" className="text-sm" />
          {t('footer')}
        </span>
        <span className="font-mono text-secondary">{AUDIT_RULES[market]}</span>
      </div>
    </aside>
  );
}

function Bar({
  label,
  value,
  share,
  tone,
}: {
  label: string;
  value: number;
  share: number;
  tone: 'gap' | 'safe';
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 text-on-surface-variant">{label}</span>
        <Amount
          value={value}
          className={cn('font-bold', tone === 'gap' ? 'text-gap' : 'text-safe')}
        />
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
        <div
          className={cn('lp-grow h-full rounded-full', tone === 'gap' ? 'bg-gap' : 'bg-safe')}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
