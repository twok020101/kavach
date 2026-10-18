import { ProofResponse, type FieldScore } from '@kavach/schemas';
import { ArrowLeft, BadgeCheck, CircleDashed, ExternalLink, FlaskConical } from 'lucide-react';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { EvidenceBand } from '@/components/kavach/evidence-band';
import { RuleId } from '@/components/kavach/verified-badge';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { Logo } from '@/components/kavach/logo';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';

const EVALS_URL = 'https://github.com/twok020101/kavach/tree/main/evals';

async function loadProof() {
  try {
    return await api('/v1/public/proof', ProofResponse, { cache: 'no-store' });
  } catch {
    return null;
  }
}

/** S26 Proof: how accurately Kavach reads real policies, stated honestly. */
export default async function ProofPage({ params }: PageProps<'/[locale]/proof'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('proof');
  const format = await getFormatter();
  const proof = await loadProof();

  const pct = (a: number) => format.number(a, { style: 'percent', maximumFractionDigits: 0 });

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <Link href="/" aria-label={t('back')} className="flex items-center gap-1 text-primary">
          <ArrowLeft aria-hidden className="size-5" />
          <Logo />
        </Link>
        <LanguageSwitch className="ml-auto" />
      </header>
      <EvidenceBand
        as="header"
        wordings={proof?.results.wordings}
        checked={proof?.results.labelsChecked}
      />

      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pb-16 pt-4">
        <section className="flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-muted">{t('intro')}</p>
        </section>

        {!proof ? (
          <p role="alert" className="rounded-md bg-gap-bg p-3 text-gap">
            {t('error')}
          </p>
        ) : (
          <>
            {proof.results.mode === 'fixtures' && (
              <p className="flex gap-2 rounded-md bg-partial-bg p-3 text-partial">
                <FlaskConical aria-hidden className="mt-0.5 size-5 shrink-0" />
                {t('fixtureBanner')}
              </p>
            )}

            <Card as="section" aria-labelledby="overall-title" className="flex flex-col gap-4">
              <div>
                <h2 id="overall-title" className="text-sm font-semibold text-muted">
                  {t('overall')}
                </h2>
                {proof.results.overall.accuracy === null ? (
                  <p className="font-display text-3xl font-bold text-muted">{t('notMeasured')}</p>
                ) : (
                  <p className="amount font-display text-5xl font-bold text-primary">
                    {pct(proof.results.overall.accuracy)}
                  </p>
                )}
                <p className="text-muted">
                  {proof.results.overall.labelled
                    ? t('overallDetail', {
                        correct: proof.results.overall.correct,
                        labelled: proof.results.overall.labelled,
                      })
                    : t('noLabels')}
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
                <Stat
                  label={t('stats.wordings')}
                  value={t('stats.wordingsValue', { count: proof.results.wordings })}
                />
                <Stat label={t('stats.read')} value={String(proof.results.wordingsRead)} />
                <Stat
                  label={t('stats.checked')}
                  value={t('stats.checkedValue', {
                    checked: proof.results.labelsChecked,
                    total: proof.results.wordings,
                  })}
                />
                <Stat
                  label={t('stats.date')}
                  value={format.dateTime(new Date(proof.results.runAt), { dateStyle: 'medium' })}
                />
                <Stat
                  label={t('stats.model')}
                  value={
                    proof.results.mode === 'fixtures' ? t('stats.fixtures') : proof.results.model
                  }
                  wide
                />
              </dl>
            </Card>

            <Section id="fields" title={t('perFieldTitle')} intro={t('perFieldIntro')}>
              <ul className="flex flex-col gap-3">
                {proof.results.perField.map((f) => (
                  <FieldBar
                    key={f.field}
                    score={f}
                    label={t(`fields.${f.field}`)}
                    value={
                      f.accuracy === null
                        ? t('fieldNoLabels')
                        : `${pct(f.accuracy)} · ${t('fieldScore', { correct: f.correct, labelled: f.labelled })}`
                    }
                  />
                ))}
              </ul>
            </Section>

            <Section id="wordings" title={t('wordingsTitle')} intro={t('wordingsIntro')}>
              <ul className="flex flex-col gap-3">
                {proof.results.results.map((w) => (
                  <Card as="li" key={w.uin} className="flex flex-col gap-2 p-4">
                    <p className="font-semibold">{w.product}</p>
                    <p className="text-sm text-muted">{w.insurer}</p>
                    <p className="font-mono text-xs text-muted">UIN {w.uin}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="primary">{t(`segment.${w.segment}`)}</Badge>
                      <Badge tone={w.status === 'read' ? 'neutral' : 'gap'}>
                        {t(`status.${w.status}`)}
                      </Badge>
                      {w.humanChecked ? (
                        <Badge tone="safe" icon={BadgeCheck}>
                          {t('labelChecked')}
                        </Badge>
                      ) : (
                        <Badge tone="partial" icon={CircleDashed}>
                          {t('labelUnchecked')}
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </ul>
            </Section>

            <Section id="rules" title={t('rulesTitle')} intro={t('rulesIntro')}>
              <p className="font-semibold">
                {t('rulesCount', {
                  verified: proof.rules.filter((r) => r.status === 'verified').length,
                  total: proof.rules.length,
                })}
              </p>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
                {proof.rules.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1.5 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <RuleId id={r.id} />
                      {r.status === 'verified' ? (
                        <Badge tone="safe" icon={BadgeCheck}>
                          {t('ruleVerified')}
                        </Badge>
                      ) : (
                        <Badge tone="partial" icon={CircleDashed}>
                          {t('ruleToVerify')}
                        </Badge>
                      )}
                    </div>
                    <p>{r.name}</p>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="method" title={t('methodTitle')}>
              <ul className="flex list-disc flex-col gap-2 pl-5">
                <li>
                  {t('method.dataset', {
                    count: proof.results.wordings,
                    insurers: new Set(proof.results.results.map((w) => w.insurer)).size,
                  })}
                </li>
                <li>{t('method.labels')}</li>
                <li>{t('method.scoring')}</li>
                <li>{t('method.spoken')}</li>
                <li>{t('method.code')}</li>
              </ul>
              <a
                href={EVALS_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 font-semibold text-primary underline"
              >
                {t('codeLink')}
                <ExternalLink aria-hidden className="size-4" />
              </a>
            </Section>

            <Section id="honest" title={t('honestTitle')}>
              <p>{t('honest')}</p>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-3">
      <h2 id={`${id}-title`} className="font-display text-2xl font-bold">
        {title}
      </h2>
      {intro && <p className="text-muted">{intro}</p>}
      {children}
    </section>
  );
}

function Stat({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-2 sm:col-span-4' : undefined}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="break-words font-semibold">{value}</dd>
    </div>
  );
}

function FieldBar({ score, label, value }: { score: FieldScore; label: string; value: string }) {
  const width = `${Math.round((score.accuracy ?? 0) * 100)}%`;
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}</span>
        <span className="amount shrink-0 text-sm text-muted">{value}</span>
      </div>
      <div className="h-3 rounded-sm bg-sunken" aria-hidden>
        {score.accuracy !== null && <div className="h-3 rounded-sm bg-primary" style={{ width }} />}
      </div>
    </li>
  );
}
