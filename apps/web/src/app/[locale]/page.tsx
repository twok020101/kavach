import { ProofResponse } from '@kavach/schemas';
import {
  ArrowRight,
  Baby,
  BookOpenCheck,
  CircleCheck,
  FileSearch,
  FileWarning,
  GitBranch,
  Globe,
  Hospital,
  IndianRupee,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { Boot } from '@/components/kavach/boot';
import { EvidenceBand } from '@/components/kavach/evidence-band';
import { IsIsNot } from '@/components/kavach/is-is-not';
import {
  FamilyStrip,
  MomentStoryboard,
  Spotlit,
  WordsRise,
} from '@/components/kavach/landing-live';
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

/** Entrance order of the opening section once the Boot panel lifts. */
const rise = (i: number) => ({ '--i': i }) as CSSProperties;

/**
 * S01 Landing: the plain-register structure (statement, two controls, the ₹90,000 moment,
 * the three moments, what Kavach is and is not, the WhatsApp door, the evidence band) with
 * the opening and the calm motion Jai asked for on 17 Oct evening (plain-register spec,
 * "Landing exception"). The section rhythm and card composition follow the Stitch landing
 * (stat ribbon under the opening, the moments as a band of cards with icon tiles, a centred
 * closing call). Every rupee comes from the engine's worked examples.
 */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const ts = await getTranslations('setup.landing');
  const tProof = await getTranslations('proof');
  const counts = await proofCounts();

  const people = [
    { name: 'Rahul', relation: t('family.relations.self') },
    { name: 'Priya', relation: t('family.relations.spouse') },
    { name: 'Anaya', relation: t('family.relations.child') },
    { name: 'Suresh', relation: t('family.relations.father') },
    { name: 'Kamala', relation: t('family.relations.mother') },
  ];

  return (
    <>
      <Boot />
      <div className="landing flex min-h-dvh flex-col">
        <header className="rise border-b border-border" style={rise(0)}>
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

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-16 px-4 pb-16 pt-10 sm:px-6 lg:gap-20 lg:pt-14">
          {/* The opening section: statement, two controls, the story, the family Kavach knows */}
          <Spotlit className="relative grid items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            <div className="aurora" aria-hidden />
            <div className="flex max-w-3xl flex-col gap-6">
              <p className="rise label" style={rise(1)}>
                {t('kicker')}
              </p>
              <WordsRise
                text={t('titlePlain')}
                emphasis={t('titleEm')}
                className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
              />
              <p className="rise max-w-2xl text-lg leading-relaxed" style={rise(3)}>
                {t('lead')}
              </p>
              <div className="rise flex flex-wrap gap-3" style={rise(4)}>
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
              <p className="rise text-sm text-muted" style={rise(5)}>
                {t('tryHospitalSub')}
              </p>
              <div className="rise" style={rise(6)}>
                <Link
                  href={{ pathname: '/desk', query: { demo: '1', scene: 'maternity' } }}
                  className={buttonClasses({
                    variant: 'soft',
                    size: 'lg',
                    className: 'w-fit justify-start text-left',
                  })}
                >
                  <Baby aria-hidden className="size-6 shrink-0" />
                  <span className="flex flex-col">
                    <span>{t('tryMaternity')}</span>
                    <span className="text-sm font-medium opacity-80">{t('tryMaternitySub')}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0" />
                </Link>
                <Link
                  href={{ pathname: '/desk', query: { demo: '1', scene: 'singapore' } }}
                  className={buttonClasses({
                    variant: 'soft',
                    size: 'lg',
                    className: 'mt-3 w-fit justify-start text-left',
                  })}
                >
                  <Globe aria-hidden className="size-6 shrink-0" />
                  <span className="flex flex-col">
                    <span>{t('trySingapore')}</span>
                    <span className="text-sm font-medium opacity-80">{t('trySingaporeSub')}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 shrink-0" />
                </Link>
              </div>
            </div>

            <div className="rise flex flex-col gap-8 lg:pt-6" style={rise(5)}>
              <div>
                <p className="label mb-3">{t('story.caption')}</p>
                <MomentStoryboard
                  steps={[
                    { title: t('story.step1.title'), body: t('story.step1.body') },
                    { title: t('story.step2.title'), body: t('story.step2.body') },
                    { title: t('story.step3.title'), body: t('story.step3.body') },
                  ]}
                  saving={landingNumbers.hospitalSaving}
                  savingLabel={t('story.saving')}
                  pauseLabel={t('story.pause')}
                  playLabel={t('story.play')}
                />
              </div>
              <FamilyStrip
                people={people}
                title={t('family.title')}
                caption={t('family.caption')}
              />
            </div>

            {/* The stat ribbon under the opening (from the Stitch landing), across the whole
                width: what Kavach has found in the sample family, each figure from the engine or
                the proof run. */}
            <ul
              aria-label={t('statsLabel')}
              className="rise grid gap-3 sm:grid-cols-3 lg:col-span-2"
              style={rise(7)}
            >
              <Stat
                icon={IndianRupee}
                tone="safe"
                value={<AnimatedAmount value={landingNumbers.hospitalSaving} />}
                caption={t('stats.desk')}
              />
              <Stat
                icon={FileSearch}
                tone="primary"
                value={<AnimatedAmount value={landingNumbers.claimRecoverable} />}
                caption={t('stats.claim')}
              />
              {counts.wordings !== undefined && (
                <Stat
                  icon={BookOpenCheck}
                  tone="primary"
                  value={counts.wordings}
                  caption={t('stats.wordings')}
                />
              )}
            </ul>
          </Spotlit>

          {/* The ₹90,000 moment in words: the decision, with its tick, before anyone signs */}
          <section aria-labelledby="moment-title" className="max-w-3xl">
            <Reveal className="flex items-start gap-4 rounded-md border border-border bg-surface p-5 sm:p-6">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-safe-bg text-safe">
                <CircleCheck aria-hidden className="size-6" />
              </span>
              <div className="flex min-w-0 flex-col gap-2">
                <h2 id="moment-title" className="font-display text-xl font-bold">
                  {t.rich('moment.title', {
                    saving: () => <AnimatedAmount value={landingNumbers.hospitalSaving} />,
                  })}
                </h2>
                <p className="text-base leading-relaxed">
                  {t.rich('moment.body', {
                    deluxe: () => (
                      <Amount value={landingNumbers.hx1Deluxe} className="font-semibold" />
                    ),
                    standard: () => (
                      <Amount value={landingNumbers.hx1Standard} className="font-semibold" />
                    ),
                  })}
                </p>
              </div>
            </Reveal>
          </section>

          {/* Three moments: a quiet band with three white cards (from the Stitch landing) */}
          <section
            id="moments"
            aria-labelledby="moments-title"
            className="flex scroll-mt-6 flex-col gap-8 rounded-lg bg-sunken p-5 sm:p-8"
          >
            <Reveal className="flex max-w-2xl flex-col gap-2">
              <h2 id="moments-title" className="font-display text-2xl font-bold sm:text-3xl">
                {t('momentsTitle')}
              </h2>
              <p className="text-muted">{t('momentsIntro')}</p>
            </Reveal>
            <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
              <Moment
                n={1}
                icon={GitBranch}
                kicker={t('momentKicker', { n: '01', when: t('moments.change.when') })}
                title={t('moments.change.title')}
                body={t('moments.change.body')}
                stat={t('moments.change.stat')}
              />
              <Moment
                n={2}
                icon={Hospital}
                accent
                kicker={t('momentKicker', { n: '02', when: t('moments.hospital.when') })}
                title={t('moments.hospital.title')}
                body={t('moments.hospital.body')}
                stat={t.rich('moments.hospital.stat', {
                  amount: () => <AnimatedAmount value={landingNumbers.hospitalSaving} />,
                })}
              />
              <Moment
                n={3}
                icon={FileWarning}
                kicker={t('momentKicker', { n: '03', when: t('moments.claim.when') })}
                title={t('moments.claim.title')}
                body={t('moments.claim.body')}
                stat={t.rich('moments.claim.stat', {
                  amount: () => <AnimatedAmount value={landingNumbers.claimRecoverable} />,
                })}
              />
            </ol>
          </section>

          {/* What Kavach is / is not */}
          <section aria-label={t('trust.title')} className="max-w-3xl">
            <Reveal>
              <IsIsNot />
            </Reveal>
          </section>

          <section className="max-w-3xl">
            <Reveal>
              <WhatsAppCard />
            </Reveal>
          </section>

          <section className="max-w-3xl border-t border-border pt-6">
            <Reveal className="flex flex-col gap-3">
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
          </section>

          {/* The closing call (from the Stitch landing): centred, the two scenes and the way to
              your own family. */}
          <section
            aria-labelledby="closing-title"
            className="rounded-lg bg-sunken p-6 sm:p-10 lg:p-14"
          >
            <Reveal className="flex flex-col gap-6 sm:items-center sm:text-center">
              <div className="flex max-w-2xl flex-col gap-2">
                <h2 id="closing-title" className="font-display text-2xl font-bold sm:text-4xl">
                  {t('closing.title')}
                </h2>
                <p className="text-lg text-muted">{t('closing.body')}</p>
              </div>
              <div className="flex flex-wrap gap-3 sm:justify-center">
                <Link
                  href={{ pathname: '/desk', query: { demo: '1' } }}
                  className={buttonClasses({ variant: 'accent', size: 'lg' })}
                >
                  <Hospital aria-hidden className="size-6" />
                  {t('closing.hospital')}
                </Link>
                <Link
                  href={{ pathname: '/desk', query: { demo: '1', scene: 'maternity' } }}
                  className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                >
                  <Baby aria-hidden className="size-6" />
                  {t('closing.maternity')}
                </Link>
                <Link
                  href={{ pathname: '/desk', query: { demo: '1', scene: 'singapore' } }}
                  className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                >
                  <Globe aria-hidden className="size-6" />
                  {t('closing.singapore')}
                </Link>
                <Link href="/sign-in" className={buttonClasses({ variant: 'ghost', size: 'lg' })}>
                  {t('closing.own')}
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <EvidenceBand wordings={counts.wordings} checked={counts.checked} />
      </div>
    </>
  );
}

/** One tile of the stat ribbon: an icon, the figure, and what it is. */
function Stat({
  icon: Icon,
  tone,
  value,
  caption,
}: {
  icon: LucideIcon;
  tone: 'safe' | 'primary';
  value: ReactNode;
  caption: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-border bg-surface p-3.5">
      <span
        className={
          tone === 'safe'
            ? 'flex size-10 shrink-0 items-center justify-center rounded-md bg-safe-bg text-safe'
            : 'flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary'
        }
      >
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={`font-display text-xl font-bold leading-tight ${tone === 'safe' ? 'text-safe' : 'text-primary-hover'}`}
        >
          {value}
        </span>
        <span className="min-w-0 text-sm text-muted [overflow-wrap:anywhere] [&:lang(en)]:hyphens-auto">
          {caption}
        </span>
      </span>
    </li>
  );
}

function Moment({
  n,
  icon: Icon,
  accent,
  kicker,
  title,
  body,
  stat,
}: {
  n: number;
  icon: LucideIcon;
  /** The hospital moment keeps the marigold tile, as on the brand panel. */
  accent?: boolean;
  kicker: string;
  title: string;
  body: string;
  stat: ReactNode;
}) {
  return (
    <Reveal as="li" delay={(n - 1) * 0.1} className="h-full">
      <article className="flex h-full flex-col gap-4 rounded-md border border-border bg-surface p-5 sm:p-6">
        <span
          className={
            accent
              ? 'flex size-12 items-center justify-center rounded-md bg-accent text-accent-ink'
              : 'flex size-12 items-center justify-center rounded-md bg-primary-soft text-primary'
          }
        >
          <Icon aria-hidden className="size-6" strokeWidth={1.75} />
        </span>
        <div className="flex flex-col gap-1">
          <p className="label text-primary-hover">{kicker}</p>
          <h3 className="font-display text-xl font-bold leading-snug">{title}</h3>
          <p className="mt-1 text-muted">{body}</p>
        </div>
        <p className="mt-auto flex items-center gap-2 rounded-sm bg-sunken px-3 py-2.5 font-display font-bold text-primary-hover">
          <CircleCheck aria-hidden className="size-4 shrink-0 text-safe" />
          <span>{stat}</span>
        </p>
      </article>
    </Reveal>
  );
}
