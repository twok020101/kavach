import { formatMoney } from '@kavach/engine';
import { getTranslations } from 'next-intl/server';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Icon } from '@/components/kavach/icon';
import { Reveal } from '@/components/kavach/reveal';
import { Link } from '@/i18n/navigation';
import { Cell, OptionCard, Status } from './admission';
import type { AdmissionOption, AdmissionSg } from './data';
import { DeskLine } from './desk-line';

/**
 * "Live admission decision: Sample General Hospital" (the Stitch admission section, Singapore).
 * The Singapore engine runs SX-1 on every render: Ah Kow's Shield plan is bought for Class B1,
 * the hospital offers Class A. The impact banner, both wards, who pays what (the Shield plan and
 * MediShield Life inside it), the rules and the Mandarin line all read from its result.
 */
export async function AdmissionSectionSg({ a }: { a: AdmissionSg }) {
  const t = await getTranslations('landing.admission');
  const ts = await getTranslations('landing.admissionSg');
  const money = (n: number) => formatMoney(n, 'SG');
  const wards = { ward: a.ward, quotedWard: a.quotedWard };

  const optionCopy = (o: AdmissionOption) => ({
    tariff:
      o.roomCategoryId === a.quoted.roomCategoryId && o !== a.pick
        ? ts('tariffOver', { rent: money(o.rentPerDay), ...wards })
        : ts('tariffWithin', { rent: money(o.rentPerDay), ...wards }),
    rows: o.rows.map((r) => ({
      ...r,
      label:
        r.key === 'R-SG-006' ? ts('rows.R-SG-006', { percent: a.riderCopay }) : ts(`rows.${r.key}`),
    })),
  });
  const pays = (s: { plan: number; medishield: number }) =>
    ts('policyPays', { plan: money(s.plan), medishield: money(s.medishield) });

  return (
    <section
      id="admission"
      aria-labelledby="admission-title"
      className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      <Reveal className="mx-auto mb-10 flex max-w-3xl flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1 text-label-caps font-bold uppercase text-on-secondary-container">
          <Icon name="local_hospital" className="text-sm" />
          {t('chip')}
        </span>
        <h2
          id="admission-title"
          className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-headline-lg"
        >
          {t('title', { hospital: a.hospital })}
        </h2>
        <p className="text-body-md text-on-surface-variant">
          {ts('sub', { age: a.patient.age, saving: money(a.saving), ...wards })}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-0.5 text-label-caps font-bold uppercase text-partial">
          <Icon name="science" className="text-sm" />
          {t('sample')}
        </span>
      </Reveal>

      <Reveal className="flex flex-col gap-6 rounded-xl bg-surface p-4 shadow-2 sm:gap-8 sm:p-8">
        {/* Impact banner */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-tertiary-container p-5 text-white sm:p-6 md:flex-row md:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
              <Icon name="price_check" className="text-2xl" weight={600} />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-display text-headline-sm font-bold">
                  {t('impactTitle', { saving: money(a.saving) })}
                </span>
                <span className="rounded-sm bg-white/15 px-2 py-0.5 text-label-caps uppercase">
                  {t('impactChip')}
                </span>
              </p>
              <p className="mt-1 text-body-sm text-white/85">
                {ts('impactBody', { share: a.planShare, above: money(a.aboveWard), ...wards })}
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-lg bg-surface px-4 py-2.5 text-center shadow-1">
            <p className="text-label-caps font-bold uppercase text-on-surface-variant">
              {t('impactLabel')}
            </p>
            <AnimatedAmount
              value={a.saving}
              className="font-display text-[1.75rem] font-bold leading-9 tracking-[-0.02em] text-safe"
            />
          </div>
        </div>

        {/* The ward offered and the ward the plan is bought for, side by side on a laptop */}
        <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <OptionCard
            i={0}
            tone="cut"
            badKey="R-SG-005"
            chip={ts('chipCut')}
            title={ts('optionA', { room: a.quoted.label })}
            billLabel={t('bill')}
            option={a.quoted}
            copy={optionCopy(a.quoted)}
            none={t('none')}
            youPay={t('youPay')}
            policyPays={pays(a.quotedShares)}
            note={ts('noteCut', { share: a.planShare, ...wards })}
            statuses={a.statuses}
            verified={t('verified')}
            toVerify={t('toVerify')}
          />
          <OptionCard
            i={1}
            tone="pick"
            chip={ts('chipPick')}
            title={ts('optionB', { room: a.pick.label })}
            billLabel={t('bill')}
            option={a.pick}
            copy={optionCopy(a.pick)}
            none={t('none')}
            youPay={t('youPay')}
            policyPays={pays(a.pickShares)}
            note={ts('notePick')}
            statuses={a.statuses}
            verified={t('verified')}
            toVerify={t('toVerify')}
          />
        </div>

        {/* Why these numbers: the sources and the rules that ran */}
        <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-4 sm:p-6">
          <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
            <h3 className="flex items-center gap-2 font-display text-title-md font-bold text-primary">
              <Icon name="shield_lock" className="text-xl" />
              {t('whyTitle')}
            </h3>
            <span className="rounded-sm bg-surface px-2.5 py-1 font-mono text-xs font-semibold">
              {t('whyChip', { id: 'R-SG-005' })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <Cell label={ts('prorationLabel')}>
              <p className="font-mono text-xs font-semibold text-primary">R-SG-001</p>
              <p className="font-serif text-citation-sm text-on-surface-variant">
                {ts('prorationBody', {
                  wardShare: a.mshlWardShare,
                  surgicalShare: a.mshlSurgicalShare,
                  ...wards,
                })}
              </p>
              <Status
                status={a.statuses['R-SG-001'] ?? 'to_verify'}
                verified={t('verified')}
                toVerify={t('toVerify')}
              />
            </Cell>
            <Cell label={t('ruleApplied')}>
              <p className="font-mono text-xs font-semibold text-primary">R-SG-005</p>
              <p className="font-serif text-citation-sm text-on-surface-variant">
                {ts('rulesNames.R-SG-005')}
              </p>
              <Status
                status={a.statuses['R-SG-005'] ?? 'to_verify'}
                verified={t('verified')}
                toVerify={t('toVerify')}
              />
            </Cell>
            <Cell label={ts('riderLabel')}>
              <p className="font-serif text-citation-sm text-on-surface-variant">
                {ts('riderBody', { percent: a.riderCopay, cap: money(a.riderCap) })}
              </p>
              {a.riderSource?.url && (
                <a
                  href={a.riderSource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2"
                >
                  {ts('openSource')}
                  <Icon name="open_in_new" className="text-sm" />
                </a>
              )}
            </Cell>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-label-caps uppercase text-on-surface-variant">{t('fired')}</span>
            {a.fired.map((id) => (
              <span
                key={id}
                title={ts.has(`rulesNames.${id}`) ? ts(`rulesNames.${id}`) : undefined}
                className="rounded-sm bg-surface px-2 py-0.5 font-mono text-xs text-primary"
              >
                {id}
              </span>
            ))}
            <Link
              href="/proof"
              className="ml-auto inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {t('allRules')}
              <Icon name="arrow_forward" className="text-base" />
            </Link>
          </div>
        </div>

        <DeskLine
          lang="zh"
          speechLang="zh-SG"
          line={ts('deskLine', wards)}
          label={ts('deskLabel')}
          hint={ts('deskHint')}
          gloss={ts('deskGloss', wards)}
          listen={t('listen')}
          stop={t('stop')}
          copy={ts('copy')}
          copied={t('copied')}
        />

        <DisclaimerBar kind="hospitalSg" />
      </Reveal>
    </section>
  );
}
