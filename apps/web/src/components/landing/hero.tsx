import { getTranslations } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { Spotlit, WordsRise } from '@/components/kavach/landing-live';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { landingNumbers } from '@/lib/mock/landing';
import type { Admission } from './data';

/** Entrance order of the opening section once the gateway lifts. */
const rise = (i: number) => ({ '--i': i }) as CSSProperties;

const FAMILY = ['Rahul', 'Priya', 'Anaya', 'Suresh', 'Kamala'];
const TINTS = [
  'bg-primary-soft text-primary-hover',
  'bg-primary-soft text-primary-hover',
  'bg-safe-bg text-safe',
  'bg-partial-bg text-partial',
  'bg-partial-bg text-partial',
];

/**
 * The opening section (Stitch hero): the statement with its marigold second line, the two ways
 * in, the stat ribbon and, on the right, the engine's own check of the Sharma household.
 */
export async function Hero({ admission, wordings }: { admission: Admission; wordings?: number }) {
  const t = await getTranslations('landing.hero');
  return (
    <Spotlit className="relative bg-surface-container-low px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:gap-12">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <p
            className="rise inline-flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1.5 shadow-1"
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
            className="font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.02em] text-primary sm:text-headline-xl lg:text-[3rem] lg:leading-[1.12]"
          />
          <p className="rise max-w-2xl text-body-lg text-on-surface-variant" style={rise(3)}>
            {t('lead')}
          </p>

          <div className="rise flex flex-wrap items-center gap-3 pt-1" style={rise(4)}>
            <Link
              href={{ pathname: '/desk', query: { demo: '1' } }}
              className="btn-solid flex min-h-14 items-center gap-2.5 rounded-md bg-primary px-5 text-title-md font-bold text-on-primary shadow-2 hover:bg-primary-hover"
            >
              <Icon name="bolt" className="text-xl" />
              {t('tryHospital')}
              <span className="rounded-sm bg-surface-container-high px-2 py-0.5 text-label-caps uppercase text-primary">
                {t('tryHospitalChip')}
              </span>
            </Link>
            <Link
              href="/demo"
              className="lift flex min-h-14 items-center gap-2 rounded-md bg-surface px-5 text-title-md text-primary shadow-1 hover:bg-surface-container"
            >
              <Icon name="family_restroom" className="text-xl text-secondary" />
              {t('explore')}
              <span className="rounded-sm bg-accent-soft px-2 py-0.5 text-label-caps font-bold uppercase text-partial">
                {t('exploreChip')}
              </span>
            </Link>
          </div>
          <Link
            href={{ pathname: '/desk', query: { demo: '1', scene: 'maternity' } }}
            className="rise -mt-2 inline-flex min-h-11 w-fit items-center gap-1.5 text-body-md font-semibold text-primary underline-offset-4 hover:underline"
            style={rise(5)}
          >
            <Icon name="pregnant_woman" className="text-lg" />
            {t('maternity')}
            <Icon name="arrow_forward" className="text-base" />
          </Link>

          <ul
            aria-label={t('statsLabel')}
            className="rise grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4 sm:gap-4"
            style={rise(6)}
          >
            <Stat
              icon="savings"
              tone="text-safe"
              value={<Amount value={admission.saving} />}
              caption={t('stats.desk')}
            />
            <Stat
              icon="gavel"
              tone="text-primary"
              value={<Amount value={landingNumbers.claimRecoverable} />}
              caption={t('stats.claim')}
            />
            {wordings !== undefined && (
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

        <LiveAudit admission={admission} />
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
async function LiveAudit({ admission: a }: { admission: Admission }) {
  const t = await getTranslations('landing.audit');
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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
          {FAMILY.map((name, i) => (
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
        <span className="font-mono text-secondary">R-HL-001 · R-MG-001</span>
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
