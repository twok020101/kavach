import { formatInr } from '@kavach/engine';
import { getTranslations } from 'next-intl/server';
import { Amount } from '@/components/kavach/amount';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Icon } from '@/components/kavach/icon';
import { Reveal } from '@/components/kavach/reveal';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import type { Admission, AdmissionOption, RuleStatus } from './data';
import { DeskLine } from './desk-line';

/**
 * "Live admission decision: City Heart Hospital" (Stitch). The engine runs HX-1 on every render;
 * the impact banner, both options, the rules strip and the Hindi line all read from its result.
 */
export async function AdmissionSection({ a }: { a: Admission }) {
  const t = await getTranslations('landing.admission');
  const inr = formatInr;
  const excess = a.quoted.rentPerDay - a.limit;

  const optionCopy = (o: AdmissionOption) => ({
    tariff:
      o.rentPerDay > a.limit
        ? t('tariffOver', { rent: inr(o.rentPerDay), excess: inr(excess), limit: inr(a.limit) })
        : t('tariffWithin', { rent: inr(o.rentPerDay), limit: inr(a.limit) }),
    rows: o.rows.map((r) => ({
      ...r,
      label:
        r.key === 'copay'
          ? t('rows.copay', { percent: a.copayPercent, age: a.copayFromAge })
          : t(`rows.${r.key}`),
    })),
  });

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
          {t('sub', {
            age: a.patient.age,
            si: inr(a.sumInsured),
            limit: inr(a.limit),
            diff: inr(excess),
            saving: inr(a.saving),
          })}
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
                  {t('impactTitle', { saving: inr(a.saving) })}
                </span>
                <span className="rounded-sm bg-white/15 px-2 py-0.5 text-label-caps uppercase">
                  {t('impactChip')}
                </span>
              </p>
              <p className="mt-1 text-body-sm text-white/85">
                {t('impactBody', { rent: inr(a.pick.rentPerDay), base: inr(a.ratioBase) })}
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

        {/* Option A and Option B, side by side on a laptop */}
        <div className="stagger grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <OptionCard
            i={0}
            tone="cut"
            chip={t('chipCut')}
            title={t('optionA', { room: a.quoted.label })}
            billLabel={t('bill')}
            option={a.quoted}
            copy={optionCopy(a.quoted)}
            none={t('none')}
            youPay={t('youPay')}
            policyPays={t('policyPays', { amount: inr(a.quoted.policyPays) })}
            note={t('noteCut', { limit: inr(a.limit), rent: inr(a.quoted.rentPerDay) })}
            statuses={a.statuses}
            verified={t('verified')}
            toVerify={t('toVerify')}
          />
          <OptionCard
            i={1}
            tone="pick"
            chip={t('chipPick')}
            title={t('optionB', { room: a.pick.label })}
            billLabel={t('bill')}
            option={a.pick}
            copy={optionCopy(a.pick)}
            none={t('none')}
            youPay={t('youPay')}
            policyPays={t('policyPays', { amount: inr(a.pick.policyPays) })}
            note={t('notePick')}
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
              {t('whyChip', { id: a.ratioRule.id })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
            <Cell label={t('circular2020')}>
              <p className="font-mono text-xs font-semibold text-primary [overflow-wrap:anywhere]">
                {a.circularRef}
              </p>
              <p className="font-serif text-citation-sm text-on-surface-variant">
                {t('circular2020Body')}
              </p>
            </Cell>
            <Cell label={t('ruleApplied')}>
              <p className="font-mono text-xs font-semibold text-primary">{a.ratioRule.id}</p>
              <p className="font-serif text-citation-sm text-on-surface-variant">
                {t(`rulesNames.${a.ratioRule.id}`)}
              </p>
              <Status
                status={a.ratioRule.status}
                verified={t('verified')}
                toVerify={t('toVerify')}
              />
            </Cell>
            <Cell label={t('master2024')}>
              <p className="font-serif text-citation-sm text-on-surface-variant">
                {t('master2024Body')}
              </p>
              {a.masterUrl && (
                <a
                  href={a.masterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2"
                >
                  {t('openPdf')}
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
                title={t.has(`rulesNames.${id}`) ? t(`rulesNames.${id}`) : undefined}
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
          line={t('deskLine', { rent: inr(a.pick.rentPerDay), limit: inr(a.limit) })}
          label={t('deskLabel')}
          hint={t('deskHint')}
          gloss={t('deskGloss', { rent: inr(a.pick.rentPerDay), limit: inr(a.limit) })}
          listen={t('listen')}
          stop={t('stop')}
          copy={t('copy')}
          copied={t('copied')}
        />

        <DisclaimerBar kind="hospital" />
      </Reveal>
    </section>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface p-3.5">
      <p className="text-label-caps font-bold uppercase text-on-surface-variant">{label}</p>
      {children}
    </div>
  );
}

function Status({
  status,
  verified,
  toVerify,
}: {
  status: RuleStatus;
  verified: string;
  toVerify: string;
}) {
  return status === 'verified' ? (
    <span className="flex items-center gap-1 text-xs font-semibold text-safe">
      <Icon name="verified" className="text-sm" />
      {verified}
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs font-semibold text-partial">
      <Icon name="pending" className="text-sm" />
      {toVerify}
    </span>
  );
}

function OptionCard({
  i,
  tone,
  chip,
  title,
  billLabel,
  option,
  copy,
  none,
  youPay,
  policyPays,
  note,
  statuses,
  verified,
  toVerify,
}: {
  i: number;
  tone: 'cut' | 'pick';
  chip: string;
  title: string;
  billLabel: string;
  option: AdmissionOption;
  copy: { tariff: string; rows: (AdmissionOption['rows'][number] & { label: string })[] };
  none: string;
  youPay: string;
  policyPays: string;
  note: string;
  statuses: Record<string, RuleStatus>;
  verified: string;
  toVerify: string;
}) {
  const cut = tone === 'cut';
  return (
    <article
      className="lift flex min-w-0 flex-col gap-5 rounded-xl bg-surface-container-low p-4 sm:p-6"
      style={{ '--i': i + 1 } as React.CSSProperties}
    >
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0">
          <span
            className={cn(
              'mb-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.06em]',
              cut ? 'bg-error-container text-on-error-container' : 'bg-safe-bg text-safe',
            )}
          >
            <Icon name={cut ? 'error' : 'task_alt'} className="text-sm" />
            {chip}
          </span>
          <h3 className="font-display text-headline-sm font-bold">{title}</h3>
          <p className="text-body-sm text-on-surface-variant">{copy.tariff}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 sm:block sm:text-right">
          <span className="text-label-caps text-on-surface-variant">{billLabel}</span>
          <Amount value={option.bill} className="block font-display text-numeral-md font-bold" />
        </div>
      </div>

      <dl className="flex flex-col gap-2.5 rounded-lg bg-surface p-3 text-body-sm sm:p-4">
        {copy.rows.map((r) => {
          const zero = r.amount === 0;
          const bad = cut && r.key === 'R-HL-001';
          return (
            <div key={r.key} className="flex items-baseline justify-between gap-3">
              <dt
                className={cn(
                  'min-w-0',
                  bad ? 'font-semibold text-error' : 'text-on-surface-variant',
                )}
              >
                {r.label}
                {r.ruleId && (
                  <span
                    className="ml-1.5 whitespace-nowrap font-mono text-[0.6875rem] text-outline"
                    title={statuses[r.ruleId] === 'verified' ? verified : toVerify}
                  >
                    {r.ruleId}
                  </span>
                )}
              </dt>
              <dd
                className={cn(
                  'shrink-0 font-semibold',
                  bad && 'font-bold text-error',
                  zero && 'text-safe',
                )}
              >
                {zero ? none : <Amount value={r.amount} />}
              </dd>
            </div>
          );
        })}
        <div
          className={cn(
            'mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-sm p-2.5',
            cut ? 'bg-error-container/50' : 'bg-safe-bg',
          )}
        >
          <dt
            className={cn(
              'font-display text-title-md font-bold',
              cut ? 'text-on-error-container' : 'text-safe',
            )}
          >
            {youPay}
          </dt>
          <dd>
            <Amount
              value={option.outOfPocket}
              className={cn(
                'font-display text-[1.75rem] font-bold leading-9 tracking-[-0.02em]',
                cut ? 'text-on-error-container' : 'text-safe',
              )}
            />
          </dd>
          <dd className="basis-full text-xs text-on-surface-variant">{policyPays}</dd>
        </div>
      </dl>

      <p
        className={cn(
          'flex items-start gap-2 font-serif text-citation-sm italic',
          cut ? 'text-error' : 'text-safe',
        )}
      >
        <Icon name={cut ? 'gavel' : 'verified'} className="mt-0.5 text-base" />
        <span>{note}</span>
      </p>
    </article>
  );
}
