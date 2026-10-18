import { formatMoney } from '@kavach/engine';
import { type Locale, ProofResponse } from '@kavach/schemas';
import {
  ArrowRight,
  Baby,
  BookOpenCheck,
  CircleAlert,
  CircleCheck,
  FileSearch,
  FileWarning,
  GitBranch,
  Globe,
  HandCoins,
  Hospital,
  type LucideIcon,
  Megaphone,
  MessageCircle,
  Mic,
  QrCode,
  ShieldCheck,
  Users,
  WalletCards,
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
import { CountryProvider } from '@/lib/country';
import { LANDING_EXAMPLE, marketForLocale } from '@/lib/market';
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

/** The sample family of each market, in the order the strip shows them. */
const PEOPLE = {
  IN: [
    ['Rahul', 'self'],
    ['Priya', 'spouse'],
    ['Anaya', 'child'],
    ['Suresh', 'father'],
    ['Kamala', 'mother'],
  ],
  SG: [
    ['Wei-Ming', 'self'],
    ['Hui-Ling', 'spouse'],
    ['Jia-En', 'child'],
    ['Ah Kow', 'father'],
    ['Siew-Hong', 'mother'],
  ],
} as const;

/**
 * S01 Landing, after the Stitch "family insurance intelligence" screen: the opening with its
 * stat ribbon and a preview card, the admission decision (the room offered against the room
 * Kavach suggests), the three moments, the WhatsApp door, what Kavach is and is not, a dark
 * closing band and the footer. The page follows the language's market: Mandarin and Malay show
 * the Tan family in Singapore (S$), the other languages the Sharma family in India (₹). Every
 * figure comes from `LANDING_EXAMPLE` (the engine's worked examples), never from a message.
 */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const market = marketForLocale(locale as Locale) ?? 'IN';
  const ex = LANDING_EXAMPLE[market];
  const money = (n: number) => formatMoney(n, market);
  const t = await getTranslations('landing');
  const tx = await getTranslations(`landing.ex.${market}`);
  const ts = await getTranslations('setup.landing');
  const tProof = await getTranslations('proof');
  const counts = await proofCounts();

  const scene = { pathname: '/desk', query: { demo: '1', scene: ex.scene } } as const;
  const otherScene = {
    pathname: '/desk',
    query: { demo: '1', scene: market === 'SG' ? 'hospital' : 'singapore' },
  } as const;
  const people = PEOPLE[market].map(([name, rel]) => ({
    name,
    relation: tx(`family.relations.${rel}`),
  }));
  const rents = { quoted: money(ex.quotedRent), lower: money(ex.lowerRent) };

  return (
    <CountryProvider country={market}>
      <Boot />
      <div className="landing flex min-h-dvh flex-col">
        <header className="rise border-b border-border bg-surface/80" style={rise(0)}>
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
            <Link
              href={scene}
              className={buttonClasses({
                variant: 'accent',
                size: 'sm',
                className: 'hidden md:inline-flex',
              })}
            >
              <Hospital aria-hidden className="size-5" />
              {t('tryHospital')}
            </Link>
          </div>
        </header>

        <main className="flex w-full flex-1 flex-col">
          {/* The opening: statement, controls and stat ribbon on the left, the preview card on the right */}
          <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:pt-14">
            <Spotlit className="relative grid items-start gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
              <div className="aurora" aria-hidden />
              <div className="flex min-w-0 flex-col gap-6">
                <p
                  className="rise inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary-hover"
                  style={rise(1)}
                >
                  <ShieldCheck aria-hidden className="size-4" />
                  {t('kicker')}
                </p>
                <WordsRise
                  text={t('titlePlain')}
                  emphasis={t('titleEm')}
                  className="font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl"
                />
                <p className="rise max-w-2xl text-lg leading-relaxed text-muted" style={rise(3)}>
                  {tx('lead')}
                </p>
                <div className="rise flex flex-wrap gap-3" style={rise(4)}>
                  <Link href={scene} className={buttonClasses({ variant: 'accent', size: 'lg' })}>
                    <Hospital aria-hidden className="size-6" />
                    {t('tryHospital')}
                  </Link>
                  <a
                    href="#moments"
                    className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                  >
                    {t('howItWorks')}
                  </a>
                </div>
                <p className="rise -mt-2 text-sm text-muted" style={rise(5)}>
                  {tx('tryHospitalSub')}
                </p>

                {/* The stat ribbon: what Kavach found in the sample family, from the engine */}
                <ul
                  aria-label={t('statsLabel')}
                  className="rise grid gap-3 sm:grid-cols-3"
                  style={rise(6)}
                >
                  <Stat
                    icon={HandCoins}
                    tone="safe"
                    value={<AnimatedAmount value={ex.saving} />}
                    caption={t('stats.desk')}
                  />
                  {market === 'IN' && (
                    <Stat
                      icon={FileSearch}
                      tone="primary"
                      value={<AnimatedAmount value={landingNumbers.claimRecoverable} />}
                      caption={t('stats.claim')}
                    />
                  )}
                  {counts.wordings !== undefined && (
                    <Stat
                      icon={BookOpenCheck}
                      tone="primary"
                      value={counts.wordings}
                      caption={t('stats.wordings')}
                    />
                  )}
                </ul>

                <div className="rise flex flex-col gap-3 sm:flex-row" style={rise(7)}>
                  {market === 'IN' && (
                    <SceneLink
                      href={{ pathname: '/desk', query: { demo: '1', scene: 'maternity' } }}
                      icon={Baby}
                      title={t('tryMaternity')}
                      sub={t('tryMaternitySub')}
                    />
                  )}
                  <SceneLink
                    href={otherScene}
                    icon={Globe}
                    title={tx('otherTitle')}
                    sub={tx('otherSub')}
                  />
                </div>
              </div>

              {/* The preview card: the sample family and the hospital moment in three frames */}
              <div
                className="rise flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_12px_32px_-12px_rgb(16_44_136/0.25)]"
                style={rise(5)}
              >
                <div className="flex items-center justify-between gap-3 border-b border-border bg-sunken px-5 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Users aria-hidden className="size-4 text-primary" />
                    {tx('familyName')}
                  </span>
                  <SampleBadge label={t('sampleBadge')} />
                </div>
                <div className="flex flex-col gap-6 p-5">
                  <div>
                    <p className="label mb-3">{t('story.caption')}</p>
                    <MomentStoryboard
                      steps={[
                        { title: tx('story.step1Title'), body: tx('story.step1Body') },
                        { title: tx('story.step2Title'), body: tx('story.step2Body', rents) },
                        { title: tx('story.step3Title', rents), body: tx('story.step3Body') },
                      ]}
                      saving={ex.saving}
                      savingLabel={t('story.saving')}
                      pauseLabel={t('story.pause')}
                      playLabel={t('story.play')}
                    />
                  </div>
                  <div className="border-t border-border pt-5">
                    <FamilyStrip
                      people={people}
                      title={tx('family.title')}
                      caption={tx('family.caption')}
                    />
                  </div>
                </div>
              </div>
            </Spotlit>
          </div>

          {/* The admission decision: the room offered against the room Kavach suggests */}
          <section
            id="decision"
            aria-labelledby="decision-title"
            className="scroll-mt-6 border-y border-border bg-sunken"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-14 sm:px-6">
              <Reveal className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
                <p className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-ink">
                  <Hospital aria-hidden className="size-4" />
                  {t('decision.kicker')}
                </p>
                <h2 id="decision-title" className="font-display text-3xl font-bold sm:text-4xl">
                  {t('decision.title', { hospital: tx('hospital') })}
                </h2>
                <p className="text-muted">{tx('decision.patient')}</p>
              </Reveal>

              <Reveal className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_12px_32px_-16px_rgb(16_44_136/0.25)]">
                {/* The saving banner */}
                <div className="flex flex-col gap-4 bg-safe px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-white/15">
                      <CircleCheck aria-hidden className="size-6" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="font-display text-xl font-bold leading-snug">
                        {t('decision.bannerTitle', {
                          room: tx('decision.roomLowerShort'),
                          amount: money(ex.saving),
                        })}
                      </p>
                      <p className="max-w-2xl text-white/85">{tx('decision.why')}</p>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md bg-white/10 px-4 py-2 sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                      {t('decision.bannerLabel')}
                    </p>
                    <Amount value={ex.saving} className="block font-display text-3xl font-bold" />
                  </div>
                </div>

                {/* Option A and option B side by side */}
                <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
                  <RoomOption
                    tone="gap"
                    icon={CircleAlert}
                    tag={t('decision.costsMore')}
                    option={t('decision.optionA')}
                    room={tx('decision.roomQuoted')}
                    perDay={t('decision.perDay', { amount: money(ex.quotedRent) })}
                    paysLabel={t('decision.familyPays')}
                    pays={ex.worstOutOfPocket}
                  />
                  <RoomOption
                    tone="safe"
                    icon={CircleCheck}
                    tag={t('decision.suggested')}
                    option={t('decision.optionB')}
                    room={tx('decision.roomLower')}
                    perDay={t('decision.perDay', { amount: money(ex.lowerRent) })}
                    paysLabel={t('decision.familyPays')}
                    pays={ex.bestOutOfPocket}
                  />
                </div>

                {/* What to say, which card, and where the numbers come from */}
                <div className="grid gap-4 border-t border-border bg-sunken/60 p-4 sm:p-6 md:grid-cols-[1.4fr_1fr]">
                  <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink">
                      <Megaphone aria-hidden className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="label">{t('decision.sayTitle')}</p>
                      <p className="font-display text-lg font-semibold leading-snug">
                        {tx('decision.script', { amount: money(ex.lowerRent) })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border border-border bg-surface p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                      <WalletCards aria-hidden className="size-5" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="label">{t('decision.firstCardTitle')}</p>
                      <p>{tx('decision.firstCard')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-sm text-muted">{t('decision.rulesNote')}</p>
                  <Link
                    href={scene}
                    className={buttonClasses({
                      variant: 'accent',
                      size: 'md',
                      className: 'shrink-0',
                    })}
                  >
                    <Hospital aria-hidden className="size-5" />
                    {t('tryHospital')}
                  </Link>
                </div>
              </Reveal>
            </div>
          </section>

          {/* Three moments */}
          <section
            id="moments"
            aria-labelledby="moments-title"
            className="mx-auto flex w-full max-w-6xl scroll-mt-6 flex-col gap-8 px-4 py-16 sm:px-6"
          >
            <Reveal className="flex max-w-2xl flex-col gap-2">
              <h2 id="moments-title" className="font-display text-3xl font-bold">
                {t('momentsTitle')}
              </h2>
              <p className="text-lg text-muted">{tx('momentsIntro')}</p>
            </Reveal>
            <ol className="grid gap-4 md:grid-cols-3 md:gap-5">
              <Moment
                n={1}
                icon={GitBranch}
                kicker={t('momentKicker', { n: '01', when: t('moments.change.when') })}
                title={t('moments.change.title')}
                body={tx('moments.change')}
                stat={t('moments.change.stat')}
              />
              <Moment
                n={2}
                icon={Hospital}
                accent
                kicker={t('momentKicker', { n: '02', when: t('moments.hospital.when') })}
                title={t('moments.hospital.title')}
                body={tx('moments.hospital')}
                stat={t.rich('moments.hospital.stat', {
                  amount: () => <Amount value={ex.saving} />,
                })}
                href={scene}
                linkLabel={t('tryHospital')}
              />
              <Moment
                n={3}
                icon={FileWarning}
                kicker={t('momentKicker', { n: '03', when: t('moments.claim.when') })}
                title={t('moments.claim.title')}
                body={t('moments.claim.body')}
                stat={tx.rich('moments.claimStat', {
                  amount: () => <Amount value={landingNumbers.claimRecoverable} />,
                })}
              />
            </ol>
          </section>

          {/* The WhatsApp door: features and the test number on the left, a sample chat on the right */}
          <section aria-labelledby="whatsapp-title" className="border-y border-border bg-sunken">
            <div className="mx-auto grid max-w-6xl items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
              <Reveal className="flex min-w-0 flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <p className="inline-flex w-fit items-center gap-2 rounded-full bg-safe-bg px-3 py-1 text-sm font-semibold text-safe">
                    <MessageCircle aria-hidden className="size-4" />
                    {t('whatsappSection.kicker')}
                  </p>
                  <h2 id="whatsapp-title" className="font-display text-3xl font-bold">
                    {t('whatsapp.title')}
                  </h2>
                  <p className="text-lg text-muted">{tx('whatsappBody')}</p>
                </div>
                <ul className="flex flex-col gap-4">
                  <Feature
                    icon={Mic}
                    title={t('whatsappSection.f1Title')}
                    body={t('whatsappSection.f1Body')}
                  />
                  <Feature
                    icon={Users}
                    title={t('whatsappSection.f2Title')}
                    body={t('whatsappSection.f2Body')}
                  />
                  <Feature
                    icon={QrCode}
                    title={t('whatsappSection.f3Title')}
                    body={t('whatsappSection.f3Body')}
                  />
                </ul>
                <WhatsAppCard bare />
              </Reveal>
              <Reveal delay={0.1} className="min-w-0 lg:sticky lg:top-6">
                <SampleChat
                  name={t('chat.name')}
                  sample={t('chat.sample')}
                  voice={t('chat.voice')}
                  ask={tx('chat.ask', rents)}
                  reply={tx('chat.reply', rents)}
                  savingLabel={t('chat.saving')}
                  saving={ex.saving}
                  badge={t('sampleBadge')}
                />
              </Reveal>
            </div>
          </section>

          {/* What Kavach is and is not, and where every number comes from */}
          <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <Reveal>
              <IsIsNot />
            </Reveal>
            <Reveal className="flex flex-col gap-3">
              <h2 className="font-display text-2xl font-bold">{t('trust.title')}</h2>
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

          {/* The closing band: dark, centred, the scenes and the way to your own family */}
          <section aria-labelledby="closing-title" className="bg-primary-hover text-white">
            <Reveal className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16 sm:items-center sm:px-6 sm:text-center">
              <div className="flex flex-col gap-3">
                <h2 id="closing-title" className="font-display text-3xl font-bold sm:text-4xl">
                  {t('closing.title')}
                </h2>
                <p className="text-lg text-white/85">{t('closing.body')}</p>
              </div>
              <div className="flex flex-wrap gap-3 sm:justify-center">
                <Link href={scene} className={buttonClasses({ variant: 'accent', size: 'lg' })}>
                  <Hospital aria-hidden className="size-6" />
                  {tx('closingHospital')}
                </Link>
                {market === 'IN' && (
                  <Link
                    href={{ pathname: '/desk', query: { demo: '1', scene: 'maternity' } }}
                    className={buttonClasses({ variant: 'secondary', size: 'lg' })}
                  >
                    <Baby aria-hidden className="size-6" />
                    {t('closing.maternity')}
                  </Link>
                )}
                <Link
                  href="/sign-in"
                  className="press inline-flex min-h-14 items-center gap-2 rounded-lg border-2 border-white/60 px-5 text-lg font-semibold text-white hover:bg-white/10"
                >
                  {t('closing.own')}
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
              </div>
            </Reveal>
          </section>
        </main>

        <footer className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[1.5fr_1fr]">
            <div className="flex flex-col gap-3">
              <Logo />
              <p className="max-w-md text-sm text-muted">{t('boot.tagline')}</p>
            </div>
            <ul className="flex flex-col gap-1 text-sm">
              <li>
                <Link
                  href={scene}
                  className="inline-flex min-h-12 items-center font-semibold text-primary"
                >
                  {t('tryHospital')}
                </Link>
              </li>
              <li>
                <Link
                  href="/proof"
                  className="inline-flex min-h-12 items-center font-semibold text-primary"
                >
                  {tProof('linkFromLanding')}
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-in"
                  className="inline-flex min-h-12 items-center font-semibold text-primary"
                >
                  {ts('signIn')}
                </Link>
              </li>
            </ul>
            <div className="flex flex-col gap-1 border-t border-border pt-4 text-sm text-muted md:col-span-2">
              <p>{t('footer.disclaimer')}</p>
              <p>{t('footer.sample')}</p>
              <p>{t('footer.built')}</p>
            </div>
          </div>
        </footer>
        <EvidenceBand wordings={counts.wordings} checked={counts.checked} />
      </div>
    </CountryProvider>
  );
}

/** A "Sample" pill, with an icon so it is not colour alone. */
function SampleBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-partial-bg px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-partial">
      <FileSearch aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}

/** A secondary scene: maternity, or the other market's hospital scene. */
function SceneLink({
  href,
  icon: Icon,
  title,
  sub,
}: {
  href: { pathname: '/desk'; query: Record<string, string> };
  icon: LucideIcon;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="press flex min-h-14 flex-1 items-center gap-3 rounded-md border border-border bg-surface px-4 py-3 hover:border-primary hover:bg-primary-soft"
    >
      <Icon aria-hidden className="size-6 shrink-0 text-primary" />
      <span className="flex min-w-0 flex-col">
        <span className="font-semibold text-primary-hover">{title}</span>
        <span className="text-sm text-muted">{sub}</span>
      </span>
      <ArrowRight aria-hidden className="ml-auto size-5 shrink-0 text-primary" />
    </Link>
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
    <li className="flex flex-col gap-1 rounded-md border border-border bg-surface p-3.5">
      <span className="flex items-center gap-2">
        <Icon
          aria-hidden
          className={tone === 'safe' ? 'size-5 shrink-0 text-safe' : 'size-5 shrink-0 text-primary'}
        />
        <span
          className={`font-display text-xl font-bold leading-tight ${tone === 'safe' ? 'text-safe' : 'text-primary-hover'}`}
        >
          {value}
        </span>
      </span>
      <span className="min-w-0 text-sm text-muted [overflow-wrap:anywhere] [&:lang(en)]:hyphens-auto">
        {caption}
      </span>
    </li>
  );
}

/** One room in the decision: its rate a day and what the family pays out of pocket. */
function RoomOption({
  tone,
  icon: Icon,
  tag,
  option,
  room,
  perDay,
  paysLabel,
  pays,
}: {
  tone: 'gap' | 'safe';
  icon: LucideIcon;
  tag: string;
  option: string;
  room: string;
  perDay: string;
  paysLabel: string;
  pays: number;
}) {
  const safe = tone === 'safe';
  return (
    <article
      className={
        safe
          ? 'flex flex-col gap-4 rounded-md border-2 border-safe bg-safe-bg/50 p-5'
          : 'flex flex-col gap-4 rounded-md border border-gap/40 bg-gap-bg/40 p-5'
      }
    >
      <p
        className={
          safe
            ? 'inline-flex w-fit items-center gap-1.5 rounded-full bg-safe px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white'
            : 'inline-flex w-fit items-center gap-1.5 rounded-full bg-gap-bg px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-gap'
        }
      >
        <Icon aria-hidden className="size-3.5" />
        {tag}
      </p>
      <div className="flex flex-col gap-1">
        <p className="label">{option}</p>
        <h3 className="font-display text-2xl font-bold">{room}</h3>
        <p className="text-muted">{perDay}</p>
      </div>
      <div
        className={
          safe
            ? 'mt-auto flex flex-wrap items-baseline justify-between gap-2 rounded-sm bg-surface px-4 py-3'
            : 'mt-auto flex flex-wrap items-baseline justify-between gap-2 rounded-sm bg-surface px-4 py-3'
        }
      >
        <span className="font-semibold">{paysLabel}</span>
        <Amount
          value={pays}
          className={`font-display text-3xl font-bold ${safe ? 'text-safe' : 'text-gap'}`}
        />
      </div>
    </article>
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
  href,
  linkLabel,
}: {
  n: number;
  icon: LucideIcon;
  /** The hospital moment keeps the marigold tile, as on the brand panel. */
  accent?: boolean;
  kicker: string;
  title: string;
  body: string;
  stat: ReactNode;
  href?: { pathname: '/desk'; query: Record<string, string> };
  linkLabel?: string;
}) {
  return (
    <Reveal as="li" delay={(n - 1) * 0.1} className="h-full">
      <article className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-[0_4px_16px_-8px_rgb(16_44_136/0.2)] sm:p-6">
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
        <p className="mt-auto flex items-center gap-2 rounded-sm border border-border bg-sunken px-3 py-2.5 font-display font-bold text-primary-hover">
          <CircleCheck aria-hidden className="size-4 shrink-0 text-safe" />
          <span>{stat}</span>
        </p>
        {href && linkLabel && (
          <Link
            href={href}
            className="inline-flex min-h-12 items-center gap-1 font-semibold text-primary"
          >
            {linkLabel}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </article>
    </Reveal>
  );
}

/** One feature row of the WhatsApp section. */
function Feature({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-primary shadow-sm">
        <Icon aria-hidden className="size-5" />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold">{title}</span>
        <span className="text-muted">{body}</span>
      </span>
    </li>
  );
}

/** A sample WhatsApp exchange: the family's voice note and Kavach's answer card. */
function SampleChat({
  name,
  sample,
  voice,
  ask,
  reply,
  savingLabel,
  saving,
  badge,
}: {
  name: string;
  sample: string;
  voice: string;
  ask: string;
  reply: string;
  savingLabel: string;
  saving: number;
  badge: string;
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface shadow-[0_12px_32px_-12px_rgb(16_44_136/0.25)]">
      <figcaption className="flex items-center gap-3 bg-safe px-4 py-3 text-white">
        <span className="flex size-10 items-center justify-center rounded-full bg-white/20 font-display font-bold">
          K
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">{name}</span>
          <span className="text-xs text-white/80">{sample}</span>
        </span>
        <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider">
          {badge}
        </span>
      </figcaption>
      <div className="flex flex-col gap-3 bg-sunken p-4">
        <div className="max-w-[85%] self-start rounded-md rounded-tl-none bg-surface p-3 shadow-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Mic aria-hidden className="size-3.5" />
            {voice}
          </p>
          <p>{ask}</p>
        </div>
        <div className="max-w-[90%] self-end rounded-md rounded-tr-none border border-safe/30 bg-safe-bg p-3 shadow-sm">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-safe">
            <Mic aria-hidden className="size-3.5" />
            {voice}
          </p>
          <p>{reply}</p>
          <p className="mt-3 flex items-baseline justify-between gap-3 rounded-sm bg-surface px-3 py-2">
            <span className="flex items-center gap-1.5 font-semibold text-safe">
              <CircleCheck aria-hidden className="size-4" />
              {savingLabel}
            </span>
            <Amount value={saving} className="font-display text-xl font-bold text-safe" />
          </p>
        </div>
      </div>
    </figure>
  );
}
