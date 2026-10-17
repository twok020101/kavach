import { ProofResponse } from '@kavach/schemas';
import { ArrowRight, FileWarning, GitBranch, Hospital, type LucideIcon } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { EvidenceBand } from '@/components/kavach/evidence-band';
import { IsIsNot } from '@/components/kavach/is-is-not';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { Logo } from '@/components/kavach/logo';
import { Reveal } from '@/components/kavach/reveal';
import { ThemeToggle } from '@/components/kavach/theme-toggle';
import { WhatsAppCard } from '@/components/kavach/whatsapp-card';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { landingNumbers } from '@/lib/mock/landing';

/** The honest counts for the evidence band; none when the API is unreachable. */
async function proofCounts() {
  try {
    const proof = await api('/v1/public/proof', ProofResponse, { cache: 'no-store' });
    return { wordings: proof.results.wordings, checked: proof.results.labelsChecked };
  } catch {
    return {};
  }
}

/**
 * S01 Landing in the plain register (spec 2026-10-17): a statement, two controls, the
 * ₹90,000 moment as a panel, the three moments, what Kavach is and is not, the WhatsApp
 * door, and the evidence band. Every rupee comes from the engine's worked examples.
 */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const ts = await getTranslations('setup.landing');
  const tProof = await getTranslations('proof');
  const counts = await proofCounts();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <ThemeToggle className="ml-auto" />
          <LanguageSwitch compact />
          <Link
            href="/sign-in"
            className={buttonClasses({
              variant: 'ghost',
              size: 'sm',
              className: 'hidden sm:inline-flex',
            })}
          >
            {ts('signIn')}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-14 px-4 pb-16 pt-10 sm:px-6 lg:pt-14">
        {/* The statement and the two controls */}
        <section className="flex max-w-3xl flex-col gap-6">
          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            {t('titlePlain')} <em className="not-italic text-primary">{t('titleEm')}</em>
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed">{t('lead')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={{ pathname: '/desk', query: { demo: '1' } }}
              className={buttonClasses({ variant: 'accent', size: 'lg' })}
            >
              <Hospital aria-hidden className="size-6" />
              {t('tryHospital')}
            </Link>
            <a href="#moments" className={buttonClasses({ variant: 'secondary', size: 'lg' })}>
              {t('howItWorks')}
            </a>
          </div>
          <p className="text-sm text-muted">{t('tryHospitalSub')}</p>
        </section>

        {/* The ₹90,000 moment as a panel, not a phone mock */}
        <Reveal as="section" aria-labelledby="moment-title" className="panel max-w-3xl">
          <h2 id="moment-title" className="font-display text-xl font-bold">
            {t.rich('moment.title', {
              saving: () => <AnimatedAmount value={landingNumbers.hospitalSaving} />,
            })}
          </h2>
          <p className="mt-2 text-base leading-relaxed">
            {t.rich('moment.body', {
              deluxe: () => <Amount value={landingNumbers.hx1Deluxe} className="font-semibold" />,
              standard: () => (
                <Amount value={landingNumbers.hx1Standard} className="font-semibold" />
              ),
            })}
          </p>
        </Reveal>

        {/* Three moments */}
        <section id="moments" aria-labelledby="moments-title" className="flex flex-col gap-5">
          <div className="flex max-w-2xl flex-col gap-1">
            <h2 id="moments-title" className="font-display text-2xl font-bold">
              {t('momentsTitle')}
            </h2>
            <p className="text-muted">{t('momentsIntro')}</p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3">
            <Moment
              n={1}
              icon={GitBranch}
              title={t('moments.change.title')}
              body={t('moments.change.body')}
              stat={t('moments.change.stat')}
            />
            <Moment
              n={2}
              icon={Hospital}
              title={t('moments.hospital.title')}
              body={t('moments.hospital.body')}
              stat={t.rich('moments.hospital.stat', {
                amount: () => <AnimatedAmount value={landingNumbers.hospitalSaving} />,
              })}
            />
            <Moment
              n={3}
              icon={FileWarning}
              title={t('moments.claim.title')}
              body={t('moments.claim.body')}
              stat={t.rich('moments.claim.stat', {
                amount: () => <AnimatedAmount value={landingNumbers.claimRecoverable} />,
              })}
            />
          </ol>
        </section>

        {/* What Kavach is / is not */}
        <Reveal as="section" aria-label={t('trust.title')} className="max-w-3xl">
          <IsIsNot />
        </Reveal>

        <Reveal as="section" className="max-w-3xl">
          <WhatsAppCard />
        </Reveal>

        <Reveal as="section" className="flex max-w-3xl flex-col gap-3 border-t border-border pt-6">
          <h2 className="font-display text-xl font-bold">{t('trust.title')}</h2>
          <p className="text-muted">{t('trust.body')}</p>
          <Link
            href="/proof"
            className="inline-flex min-h-12 w-fit items-center gap-1 font-semibold text-primary underline underline-offset-4"
          >
            {tProof('linkFromLanding')}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
          <p className="text-sm text-muted">{t('trustLine')}</p>
        </Reveal>
      </main>

      <EvidenceBand wordings={counts.wordings} checked={counts.checked} />
    </div>
  );
}

function Moment({
  n,
  icon: Icon,
  title,
  body,
  stat,
}: {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  stat: ReactNode;
}) {
  return (
    <li className="flex h-full flex-col gap-3 rounded-md border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <Icon aria-hidden className="size-6 text-primary" strokeWidth={1.75} />
        <span className="label">0{n}</span>
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="text-muted">{body}</p>
      <p className="mt-auto pt-2 font-display font-bold text-primary-hover">{stat}</p>
    </li>
  );
}
