import { ArrowRight, BadgeCheck, FileWarning, GitBranch, Hospital } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { AnswerCard } from '@/components/kavach/answer-card';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { Logo } from '@/components/kavach/logo';
import { WhatsAppCard } from '@/components/kavach/whatsapp-card';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Logo />
        <LanguageSwitch className="ml-auto" />
        <Link href="/sign-in" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          {ts('signIn')}
        </Link>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 pb-16 pt-6">
        <section className="grid items-center gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-5">
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              {t('headline')}
            </h1>
            <p className="text-lg text-muted">{t('subhead')}</p>
            <Link
              href={{ pathname: '/desk', query: { demo: '1' } }}
              className={buttonClasses({
                variant: 'accent',
                size: 'desk',
                className: 'py-2 text-left',
              })}
            >
              <Hospital aria-hidden className="size-7 shrink-0" />
              <span className="flex flex-1 flex-col">
                <span className="text-xl">{t('tryHospital')}</span>
                <span className="text-sm font-medium">{t('tryHospitalSub')}</span>
              </span>
              <ArrowRight aria-hidden className="size-6 shrink-0" />
            </Link>
            <Link href="/sign-in" className="self-start font-semibold text-primary underline">
              {ts('start')}
            </Link>
          </div>
          {roomCard && (
            <div aria-label={t('previewLabel')} role="group" className="md:pl-6">
              <p className="mb-2 text-sm font-semibold text-muted">{t('previewCaption')}</p>
              <AnswerCard card={roomCard} index={0} />
            </div>
          )}
        </section>

        <section aria-labelledby="moments-title" className="flex flex-col gap-4">
          <h2 id="moments-title" className="font-display text-2xl font-bold">
            {t('momentsTitle')}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            <Moment
              icon={<GitBranch aria-hidden className="size-6" />}
              title={t('moments.change.title')}
              body={t('moments.change.body')}
              stat={t('moments.change.stat')}
            />
            <Moment
              highlight
              icon={<Hospital aria-hidden className="size-6" />}
              title={t('moments.hospital.title')}
              body={t('moments.hospital.body')}
              stat={t.rich('moments.hospital.stat', {
                amount: () => <Amount value={landingNumbers.hospitalSaving} />,
              })}
            />
            <Moment
              icon={<FileWarning aria-hidden className="size-6" />}
              title={t('moments.claim.title')}
              body={t('moments.claim.body')}
              stat={t.rich('moments.claim.stat', {
                amount: () => <Amount value={landingNumbers.claimRecoverable} />,
              })}
            />
          </ul>
        </section>

        <WhatsAppCard />

        <section aria-labelledby="trust-title" className="flex items-start gap-3">
          <BadgeCheck aria-hidden className="mt-1 size-7 shrink-0 text-safe" />
          <div>
            <h2 id="trust-title" className="font-display text-xl font-bold">
              {t('trust.title')}
            </h2>
            <p className="text-muted">{t('trust.body')}</p>
            <Link
              href="/proof"
              className="mt-1 inline-flex min-h-12 items-center gap-1 font-semibold text-primary underline"
            >
              {tProof('linkFromLanding')}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-muted">
          <p>{t('footer.disclaimer')}</p>
          <p>{t('footer.sample')}</p>
          <p className="font-semibold">{t('footer.built')}</p>
        </div>
      </footer>
    </div>
  );
}

function Moment({
  icon,
  title,
  body,
  stat,
  highlight = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  stat: ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card
      as="li"
      className={cn('flex flex-col gap-2', highlight && 'border-2 border-accent bg-accent-soft')}
    >
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full',
          highlight ? 'bg-accent text-accent-ink' : 'bg-primary-soft text-primary',
        )}
      >
        {icon}
      </span>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p>{body}</p>
      <p className="mt-auto pt-2 font-display text-lg font-bold text-primary-hover">{stat}</p>
    </Card>
  );
}
