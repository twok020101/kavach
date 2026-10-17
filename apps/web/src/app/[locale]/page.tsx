import {
  ArrowRight,
  BadgeCheck,
  FileWarning,
  GitBranch,
  Hospital,
  Mic,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { AnswerCard } from '@/components/kavach/answer-card';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { Logo } from '@/components/kavach/logo';
import { Reveal, WordsRise } from '@/components/kavach/reveal';
import { ThemeToggle } from '@/components/kavach/theme-toggle';
import { WhatsAppCard } from '@/components/kavach/whatsapp-card';
import { buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { mockAnswer } from '@/lib/mock/desk';
import { landingNumbers } from '@/lib/mock/landing';
import type { Locale } from '@kavach/schemas';

/** S01 Landing: what Kavach does, and a one-tap way into the hospital scene. */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');
  const ts = await getTranslations('setup.landing');
  const tProof = await getTranslations('proof');
  const roomCard = mockAnswer(locale as Locale).cards.find((c) => c.kind === 'room_compare');

  return (
    <div className="wash min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <Logo />
        <ThemeToggle className="ml-auto" />
        <LanguageSwitch />
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
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div className="flex flex-col gap-6">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-sm font-medium text-muted">
              <Mic aria-hidden className="size-4 text-primary" />
              {t('eyebrow')}
            </p>
            <WordsRise
              text={t('headline')}
              mark={t('headlineMark')}
              className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight sm:text-6xl"
            />
            <p className="max-w-xl text-lg text-muted sm:text-xl">{t('subhead')}</p>
            <div className="flex flex-col gap-3 sm:max-w-md">
              <Link
                href={{ pathname: '/desk', query: { demo: '1' } }}
                className={buttonClasses({
                  variant: 'accent',
                  size: 'desk',
                  className: 'py-3 text-left',
                })}
              >
                <Hospital aria-hidden className="size-7 shrink-0" />
                <span className="flex flex-1 flex-col">
                  <span className="text-xl">{t('tryHospital')}</span>
                  <span className="text-sm font-medium opacity-80">{t('tryHospitalSub')}</span>
                </span>
                <ArrowRight aria-hidden className="size-6 shrink-0" />
              </Link>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href="/home"
                  className={buttonClasses({
                    variant: 'secondary',
                    size: 'md',
                    className: 'rounded-full',
                  })}
                >
                  {t('tryFamily')}
                </Link>
                <Link
                  href="/sign-in"
                  className="min-h-12 inline-flex items-center font-semibold text-primary underline underline-offset-4"
                >
                  {ts('start')}
                </Link>
              </div>
            </div>
          </div>

          {roomCard && (
            <Reveal className="justify-self-center lg:justify-self-end">
              <PhoneFrame caption={t('previewCaption')} label={t('previewLabel')}>
                <AnswerCard card={roomCard} index={0} animate />
              </PhoneFrame>
            </Reveal>
          )}
        </section>

        {/* Numbers */}
        <Reveal as="section" aria-label={t('statsLabel')}>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
            <Stat
              value={<AnimatedAmount value={landingNumbers.hospitalSaving} />}
              label={t('stats.desk')}
            />
            <Stat
              value={<AnimatedAmount value={landingNumbers.claimRecoverable} />}
              label={t('stats.claim')}
            />
            <Stat
              value={
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck aria-hidden className="size-8 text-safe" />
                  100%
                </span>
              }
              label={t('stats.cited')}
            />
          </ul>
        </Reveal>

        {/* Three moments */}
        <section aria-labelledby="moments-title" className="flex flex-col gap-6">
          <Reveal className="flex flex-col gap-2">
            <h2 id="moments-title" className="font-display text-3xl font-bold tracking-tight">
              {t('momentsTitle')}
            </h2>
            <p className="max-w-2xl text-lg text-muted">{t('momentsIntro')}</p>
          </Reveal>
          <ul className="grid gap-4 md:grid-cols-3">
            <Moment
              n={1}
              icon={GitBranch}
              title={t('moments.change.title')}
              body={t('moments.change.body')}
              stat={t('moments.change.stat')}
            />
            <Moment
              n={2}
              highlight
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
          </ul>
        </section>

        <Reveal>
          <WhatsAppCard />
        </Reveal>

        <Reveal
          as="section"
          aria-labelledby="trust-title"
          className="flex flex-col items-start gap-4 rounded-lg bg-primary p-6 text-on-primary sm:flex-row sm:items-center sm:gap-6 sm:p-8"
        >
          <BadgeCheck aria-hidden className="size-10 shrink-0 text-accent" />
          <div className="flex-1">
            <h2 id="trust-title" className="font-display text-2xl font-bold">
              {t('trust.title')}
            </h2>
            <p className="mt-1 opacity-85">{t('trust.body')}</p>
          </div>
          <Link
            href="/proof"
            className={buttonClasses({
              variant: 'accent',
              size: 'md',
              className: 'shrink-0 rounded-full',
            })}
          >
            {tProof('linkFromLanding')}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Reveal>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-8 text-sm text-muted sm:px-6">
          <p>{t('footer.disclaimer')}</p>
          <p>{t('footer.sample')}</p>
          <p className="font-semibold text-text">{t('footer.built')}</p>
        </div>
      </footer>
    </div>
  );
}

/** A phone bezel around the example answer, so the hero shows the product, not a card. */
function PhoneFrame({
  caption,
  label,
  children,
}: {
  caption: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <figure
      role="group"
      aria-label={label}
      className="flex w-full max-w-sm flex-col items-center gap-3"
    >
      <div className="relative w-full rounded-[2.4rem] border-[6px] border-[#1c1a17] bg-bg p-3 shadow-2 dark:border-[#3a3f55]">
        <span
          aria-hidden
          className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[#1c1a17] dark:bg-[#3a3f55]"
        />
        <div className="mt-4">{children}</div>
      </div>
      <figcaption className="text-sm font-medium text-muted">{caption}</figcaption>
    </figure>
  );
}

function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <li className="flex flex-col gap-1 bg-surface p-5 sm:p-6">
      <span className="font-display text-3xl font-bold tracking-tight text-primary-hover sm:text-4xl">
        {value}
      </span>
      <span className="text-muted">{label}</span>
    </li>
  );
}

function Moment({
  n,
  icon: Icon,
  title,
  body,
  stat,
  highlight = false,
}: {
  n: number;
  icon: LucideIcon;
  title: string;
  body: string;
  stat: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Reveal as="li" delay={(n - 1) * 0.08}>
      <article
        className={cn(
          'flex h-full flex-col gap-3 rounded-lg border p-5 shadow-1 sm:p-6',
          highlight ? 'border-accent/70 bg-accent-soft' : 'border-border bg-surface',
        )}
      >
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              highlight ? 'bg-accent text-accent-ink' : 'bg-primary-soft text-primary',
            )}
          >
            <Icon aria-hidden className="size-6" />
          </span>
          <span className="font-mono text-sm text-muted">0{n}</span>
        </div>
        <h3 className="font-display text-xl font-bold">{title}</h3>
        <p className="text-muted">{body}</p>
        <p className="mt-auto pt-2 font-display text-lg font-bold text-primary-hover">{stat}</p>
      </article>
    </Reveal>
  );
}
