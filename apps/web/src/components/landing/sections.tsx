import { type Country, formatMoney, RULES } from '@kavach/engine';
import type { WordingResult } from '@kavach/schemas';
import { getTranslations } from 'next-intl/server';
import type { CSSProperties, ReactNode } from 'react';
import { Amount } from '@/components/kavach/amount';
import { AnimatedAmount } from '@/components/kavach/animated-amount';
import { DisclaimerBar } from '@/components/kavach/disclaimer-bar';
import { Icon } from '@/components/kavach/icon';
import { IsIsNot } from '@/components/kavach/is-is-not';
import { LogoMark } from '@/components/kavach/logo';
import { Reveal } from '@/components/kavach/reveal';
import { cn } from '@/components/ui/cn';
import { Link } from '@/i18n/navigation';
import { landingNumbers } from '@/lib/mock/landing';
import { claimData } from './data';
import { landingT } from './market-t';

type Href = Parameters<typeof Link>[0]['href'];
const i = (n: number) => ({ '--i': n }) as CSSProperties;

/** A small uppercase eyebrow with an icon, as above each Stitch section title. */
function Eyebrow({
  icon,
  children,
  className,
}: {
  icon: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'mb-2 inline-flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase leading-4 tracking-[0.06em]',
        className ?? 'text-primary',
      )}
    >
      <Icon name={icon} className="text-sm" />
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------------------------------- */
/** The three moments where families lose money, as three cards with a feature box and a link. */
export async function Moments({ market, saving }: { market: Country; saving: number }) {
  const t = await landingT('moments', market);
  const sg = market === 'SG';
  const claim = claimData();
  const amount = (value: number) =>
    function CountUp() {
      return <AnimatedAmount value={value} />;
    };
  const cards: {
    key: 'change' | 'hospital' | 'claim';
    icon: string;
    tile: string;
    href: Href;
    linkTone: string;
    body: ReactNode;
    feature: ReactNode;
  }[] = [
    {
      key: 'change',
      icon: 'work_history',
      tile: 'bg-surface-container text-primary',
      href: '/change',
      linkTone: 'text-primary',
      body: t('change.body'),
      feature: t('change.feature'),
    },
    {
      key: 'hospital',
      icon: 'photo_camera',
      tile: 'bg-secondary-fixed text-on-secondary-container',
      href: { pathname: '/desk', query: { demo: '1', ...(sg ? { scene: 'singapore' } : {}) } },
      linkTone: 'text-secondary',
      body: t('hospital.body'),
      feature: t.rich('hospital.feature', {
        amount: amount(sg ? saving : landingNumbers.hospitalSaving),
      }),
    },
    {
      key: 'claim',
      icon: 'gavel',
      tile: 'bg-surface-container text-safe',
      href: '/claims',
      linkTone: 'text-primary',
      body: t.rich('claim.body', {
        bill: () => <Amount value={claim.bill} className="font-semibold text-on-surface" />,
        approved: () => <Amount value={claim.approved} className="font-semibold text-on-surface" />,
        cut: () => <Amount value={claim.cut} className="font-semibold text-error" />,
      }),
      feature: t.rich('claim.feature', { amount: amount(landingNumbers.claimRecoverable) }),
    },
  ];

  return (
    <section
      id="moments"
      aria-labelledby="moments-title"
      className="scroll-mt-28 bg-surface-container-low px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <Reveal className="max-w-2xl">
          <Eyebrow icon="alt_route">{t('eyebrow')}</Eyebrow>
          <h2
            id="moments-title"
            className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-headline-lg"
          >
            {t('title')}
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">{t('intro')}</p>
        </Reveal>
        <Reveal>
          <ol className="stagger grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6 lg:gap-8">
            {cards.map((c, n) => (
              <li
                key={c.key}
                style={i(n)}
                className="lift flex flex-col justify-between gap-6 rounded-xl bg-surface p-5 shadow-1 sm:p-6"
              >
                <div className="flex flex-col gap-4">
                  <span
                    className={cn('flex size-12 items-center justify-center rounded-lg', c.tile)}
                  >
                    <Icon name={c.icon} className="text-2xl" />
                  </span>
                  <div>
                    <p className="text-label-caps font-bold uppercase text-secondary">
                      {t('kicker', { n: `0${n + 1}`, when: t(`${c.key}.when`) })}
                    </p>
                    <h3 className="mt-1 font-display text-headline-sm font-bold">
                      {t(`${c.key}.title`)}
                    </h3>
                    <p className="mt-2 text-body-sm text-on-surface-variant">{c.body}</p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3.5">
                    <p className="flex items-center gap-2 text-sm font-bold text-safe">
                      <Icon name="check_circle" className="text-base" />
                      <span>{c.feature}</span>
                    </p>
                    <p className="font-serif text-citation-sm text-on-surface-variant">
                      {t(`${c.key}.featureBody`)}
                    </p>
                  </div>
                </div>
                <Link
                  href={c.href}
                  className={cn(
                    'group inline-flex min-h-11 items-center gap-1 text-title-md font-semibold',
                    c.linkTone,
                  )}
                >
                  {t(`${c.key}.link`)}
                  <Icon
                    name="arrow_forward"
                    className="text-base transition-transform duration-200 group-hover:translate-x-1"
                  />
                </Link>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/** The WhatsApp test number, when it is configured (same env as the WhatsApp card). */
function sandboxJoin() {
  const number = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER?.trim();
  const join = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN?.trim();
  if (!number || !join) return null;
  const link = `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(join)}`;
  return { number, join, link };
}

/** The figures the elder's chat quotes, from the market's engine run. */
export type ElderChat = {
  hospital: string;
  /** The dearer room's rent, the cut it brings, the saving; the room to ask for and its cost. */
  rent: number;
  cut: number;
  saving: number;
  pickRent: number;
  pay: number;
  /** India: the policy's room-rent limit. Singapore: the plan's ward and the ward offered. */
  limit?: number;
  ward?: string;
  quotedWard?: string;
};

/** Who speaks in the chat, by market: Kamala in Hindi, Siew-Hong in Mandarin. */
const ELDER: Record<Country, { initial: string; lang: string }> = {
  IN: { initial: 'क', lang: 'hi' },
  SG: { initial: 'S', lang: 'zh' },
};

/** The second door: the elder parent's WhatsApp chat, told in a phone mock, and how to try it. */
export async function ElderSection({ market, chat }: { market: Country; chat: ElderChat }) {
  const t = await landingT('elder', market);
  const tw = await getTranslations('landing.whatsapp');
  const sandbox = sandboxJoin();
  const inr = (n: number) => formatMoney(n, market);
  const elder = ELDER[market];
  const wards = { ward: chat.ward ?? '', quotedWard: chat.quotedWard ?? '' };
  const features = [
    { icon: 'mic', title: t('f1Title'), body: t('f1Body') },
    { icon: 'notifications_active', title: t('f2Title'), body: t('f2Body') },
    { icon: 'qr_code_2', title: t('f3Title'), body: t('f3Body') },
  ];

  return (
    <section
      aria-labelledby="elder-title"
      className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <Reveal className="flex flex-col gap-6 lg:col-span-5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-safe-bg px-3 py-1 text-label-caps font-bold uppercase text-safe">
            <Icon name="phone_iphone" className="text-sm" />
            {t('chip')}
          </span>
          <h2
            id="elder-title"
            className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-headline-lg"
          >
            {t('title')}
          </h2>
          <p className="text-body-md text-on-surface-variant">{t('body')}</p>
          <ul className="flex flex-col gap-4">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-container text-primary">
                  <Icon name={f.icon} className="text-lg" />
                </span>
                <span>
                  <span className="block font-display text-title-md font-bold">{f.title}</span>
                  <span className="block text-body-sm text-on-surface-variant">{f.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-label-caps font-semibold uppercase text-on-surface-variant">
                {t('sandbox')}
              </p>
              {sandbox ? (
                <>
                  <p className="font-mono text-title-md font-bold text-primary">{sandbox.number}</p>
                  <p className="text-xs text-on-surface-variant">
                    {t('joinCode', { join: sandbox.join })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-on-surface-variant">{tw('notConfigured')}</p>
              )}
            </div>
            {sandbox && (
              <a
                href={sandbox.link}
                className="btn-solid flex min-h-12 shrink-0 items-center gap-1.5 rounded-md bg-tertiary-container px-4 font-bold text-white hover:bg-tertiary"
              >
                <Icon name="chat" className="text-lg" />
                {t('open')}
              </a>
            )}
          </div>
        </Reveal>

        <Reveal className="lg:col-span-7">
          <figure className="relative rounded-2xl bg-surface-container p-3 shadow-2 sm:p-6">
            <div className="flex flex-col overflow-hidden rounded-xl bg-surface shadow-1">
              {/* Chat header */}
              <div className="flex items-center justify-between bg-tertiary-container px-4 py-3 text-white">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white p-0.5">
                    <LogoMark className="size-8" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-title-md font-bold">
                      {t('chatName')}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-on-tertiary-container">
                      <span aria-hidden className="size-2 rounded-full bg-tertiary-fixed" />
                      {t('chatStatus')}
                    </span>
                  </span>
                </div>
                <span className="flex items-center gap-3 opacity-90">
                  <Icon name="call" className="text-xl" />
                  <Icon name="more_vert" className="text-xl" />
                </span>
              </div>

              {/* Messages */}
              <div
                lang={elder.lang}
                className="stagger flex flex-col gap-4 bg-surface-container-low p-3 text-sm sm:p-4"
              >
                {/* Kamala's voice note (her side, on the right) */}
                <div className="ml-auto flex max-w-[88%] items-end gap-2" style={i(0)}>
                  <div className="flex flex-col gap-1.5 rounded-2xl rounded-br-none bg-safe-bg p-3 shadow-1">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tertiary-container text-white">
                        <Icon name="play_arrow" fill className="text-lg" />
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="block h-1.5 w-32 overflow-hidden rounded-full bg-white/70 sm:w-40">
                          <span className="lp-grow block h-full w-2/3 rounded-full bg-tertiary-container" />
                        </span>
                        <span className="text-[0.6875rem] text-on-surface-variant">
                          {t('voiceLength')}
                        </span>
                      </span>
                    </div>
                    <p className="font-serif text-citation-sm italic text-on-surface-variant">
                      “{t('voiceText', { rent: inr(chat.rent), ...wards })}”
                    </p>
                  </div>
                  <span
                    aria-hidden
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-partial-bg font-display text-xs font-bold text-partial"
                  >
                    {elder.initial}
                  </span>
                </div>

                {/* Kavach's answer (on the left) */}
                <div
                  className="flex max-w-[94%] flex-col gap-3 rounded-2xl rounded-bl-none bg-surface p-3.5 shadow-1 sm:max-w-[86%]"
                  style={i(1)}
                >
                  <p className="flex items-center gap-2 text-xs font-bold text-error">
                    <Icon name="warning" className="text-base" />
                    {t('replyWarn', wards)}
                  </p>
                  <p className="text-body-sm">
                    {t('replyBody', { limit: inr(chat.limit ?? 0), cut: inr(chat.cut), ...wards })}
                  </p>
                  <div className="flex flex-col gap-1.5 rounded-lg bg-surface-container-low p-2.5 text-xs">
                    <p className="flex items-center justify-between gap-2 font-bold text-primary">
                      <span>{t('replyCardTitle')}</span>
                      <span className="text-safe">
                        {t('replyCardSaving', { saving: inr(chat.saving) })}
                      </span>
                    </p>
                    <p>
                      {t('replyCardBody', {
                        rent: inr(chat.pickRent),
                        pay: inr(chat.pay),
                        ...wards,
                      })}
                    </p>
                    <p className="text-[0.6875rem] text-on-surface-variant">{t('replyCardRule')}</p>
                  </div>
                  <p className="flex items-center justify-end gap-2 text-[0.6875rem] text-on-surface-variant">
                    <span className="flex items-center gap-1 font-semibold text-primary">
                      <Icon name="done_all" className="text-sm text-safe" />
                      {t('replyAlert')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Input bar */}
              <div className="flex items-center gap-2 bg-surface px-3 py-2.5" aria-hidden>
                <Icon name="mood" className="text-xl text-on-surface-variant" />
                <Icon name="attach_file" className="text-xl text-on-surface-variant" />
                <span className="min-w-0 flex-1 truncate rounded-full bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">
                  {t('inputHint')}
                </span>
                <span className="flex size-9 items-center justify-center rounded-full bg-tertiary-container text-white">
                  <Icon name="mic" className="text-lg" />
                </span>
              </div>
            </div>

            {/* What reaches Rahul's phone */}
            <figcaption className="mt-3 flex items-start gap-2.5 rounded-lg bg-surface p-3 text-xs shadow-2 lg:absolute lg:-bottom-6 lg:-left-6 lg:mt-0 lg:max-w-sm">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                <Icon name="notifications_active" className="text-lg" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-on-surface">{t('caption')}</span>
                <span className="block text-on-surface-variant">
                  {t('alertPill', { hospital: chat.hospital, rent: inr(chat.pickRent), ...wards })}
                </span>
              </span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
const shortInsurer = (name: string) =>
  name
    .replace(/^The\s+/, '')
    .replace(/\s+Co\.?\s+Ltd\.?$/, '')
    .replace(/\s+Insurance$/, '');

/** The public wordings Kavach is tested on, from the proof run: no badge it has not earned. */
export async function Policies({
  results,
  checked,
  fixtures,
  masterUrl,
}: {
  results: WordingResult[];
  checked: number;
  /** The latest run used recorded answers (FAKE_LLM), so it proves the pipeline only. */
  fixtures: boolean;
  masterUrl?: string;
}) {
  const t = await getTranslations('landing.policies');
  const tp = await getTranslations('proof');
  const count = results.length;

  return (
    <section
      id="policies"
      aria-labelledby="policies-title"
      className="scroll-mt-28 bg-surface-container-low px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow icon="fact_check" className="text-safe">
              {t('eyebrow')}
            </Eyebrow>
            <h2
              id="policies-title"
              className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-headline-lg"
            >
              {t('title', { count })}
            </h2>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">{t('intro')}</p>
            {fixtures && (
              <p className="mt-2 flex max-w-2xl items-start gap-1.5 text-sm font-semibold text-partial">
                <Icon name="science" className="mt-0.5 text-base" />
                {t('fixtures')}
              </p>
            )}
          </div>
          <Link
            href="/proof"
            className="lift inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-md bg-surface px-4 text-sm font-semibold text-primary shadow-1 md:self-auto"
          >
            <Icon name="database" className="text-base text-partial" />
            {t('checked', { checked, count })}
          </Link>
        </Reveal>

        <Reveal>
          <ul className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.map((w, n) => (
              <li
                key={w.uin}
                style={i(n)}
                className="lift flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    title={w.insurer}
                    className="min-w-0 font-display text-title-md font-bold [overflow-wrap:anywhere]"
                  >
                    {shortInsurer(w.insurer)}
                  </span>
                  <span className="shrink-0 rounded-sm bg-primary-soft px-1.5 py-0.5 text-[0.6875rem] font-bold text-primary">
                    {t('publicWording')}
                  </span>
                </div>
                <p className="font-serif text-citation-sm text-on-surface-variant">{w.product}</p>
                <p className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-sm bg-surface-container px-1.5 py-0.5 text-[0.6875rem] font-semibold text-on-surface-variant">
                    {tp(`segment.${w.segment}`)}
                  </span>
                  <span className="font-mono text-[0.6875rem] text-outline [overflow-wrap:anywhere]">
                    {w.uin}
                  </span>
                </p>
                <p
                  className={cn(
                    'mt-auto flex items-center gap-1 pt-1 text-xs font-semibold',
                    w.humanChecked ? 'text-safe' : 'text-partial',
                  )}
                >
                  <Icon name={w.humanChecked ? 'verified' : 'pending'} className="text-sm" />
                  {t('cardStatus', {
                    status: fixtures ? tp('stats.fixtures') : tp(`status.${w.status}`),
                    label: w.humanChecked ? tp('labelChecked') : tp('labelUnchecked'),
                  })}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface p-4 text-xs text-on-surface-variant sm:flex-row sm:items-center">
          <p className="flex items-start gap-3">
            <Icon name="account_balance" className="text-xl text-primary" />
            <span>{t('notice')}</span>
          </p>
          <p className="flex shrink-0 flex-wrap items-center gap-x-3 font-semibold text-primary">
            {masterUrl && (
              <>
                <a
                  href={masterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center hover:underline"
                >
                  {t('masterPdf')}
                </a>
                <span aria-hidden>•</span>
              </>
            )}
            <Link href="/proof" className="inline-flex min-h-11 items-center hover:underline">
              {t('proofLink')}
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/** Who wrote a rule's figure, in a few words: the body before the first comma or colon. */
const sourceBody = (title: string) => title.split(/[,:]/)[0]!.trim();

/**
 * Singapore's rules in place of India's public wordings: every R-SG rule the engine carries, its
 * status and who sets the figure. Singapore has no single master circular, so the section says so
 * and shows which rules a person has checked against the primary page and which are still open.
 */
export async function SgRules() {
  const t = await getTranslations('landing.sgRules');
  const ts = await getTranslations('landing.admissionSg');
  const tl = await getTranslations('landing.policies');
  const rules = Object.values(RULES).filter((r) => r.id.startsWith('R-SG'));
  const checked = rules.filter((r) => r.status === 'verified').length;

  return (
    <section
      id="policies"
      aria-labelledby="sg-rules-title"
      className="scroll-mt-28 bg-surface-container-low px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <Eyebrow icon="fact_check" className="text-safe">
              {t('eyebrow')}
            </Eyebrow>
            <h2
              id="sg-rules-title"
              className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-headline-lg"
            >
              {t('title', { count: rules.length })}
            </h2>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">{t('intro')}</p>
          </div>
          <Link
            href="/proof"
            className="lift inline-flex min-h-12 shrink-0 items-center gap-2 self-start rounded-md bg-surface px-4 text-sm font-semibold text-primary shadow-1 md:self-auto"
          >
            <Icon name="database" className="text-base text-partial" />
            {t('checked', { checked, count: rules.length })}
          </Link>
        </Reveal>

        <Reveal>
          <ul className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rules.map((r, n) => {
              const source = r.sources[0]?.title ?? '';
              const own = /policy's own wording/i.test(source);
              return (
                <li
                  key={r.id}
                  style={i(n)}
                  className="lift flex flex-col gap-2 rounded-xl bg-surface p-4 shadow-1"
                >
                  <span className="w-fit rounded-sm bg-primary-soft px-1.5 py-0.5 font-mono text-[0.6875rem] font-bold text-primary">
                    {r.id}
                  </span>
                  <p className="font-display text-title-md font-bold">
                    {ts.has(`rulesNames.${r.id}`) ? ts(`rulesNames.${r.id}`) : r.id}
                  </p>
                  <p
                    title={source}
                    className="font-serif text-citation-sm text-on-surface-variant [overflow-wrap:anywhere]"
                  >
                    {own ? t('planWording') : sourceBody(source)}
                  </p>
                  <p
                    className={cn(
                      'mt-auto flex items-center gap-1 pt-1 text-xs font-semibold',
                      r.status === 'verified' ? 'text-safe' : 'text-partial',
                    )}
                  >
                    <Icon
                      name={r.status === 'verified' ? 'verified' : 'pending'}
                      className="text-sm"
                    />
                    {r.status === 'verified' ? t('verified') : t('toVerify')}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>

        {/* The same notice bar as India's, with the way to the proof page. */}
        <Reveal className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface p-4 text-xs text-on-surface-variant sm:flex-row sm:items-center">
          <p className="flex items-start gap-3">
            <Icon name="account_balance" className="text-xl text-primary" />
            <span>{t('notice')}</span>
          </p>
          <Link
            href="/proof"
            className="inline-flex min-h-11 shrink-0 items-center font-semibold text-primary hover:underline"
          >
            {tl('proofLink')}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/** What Kavach is and is not; the gateway's "Our promise" lands here. */
export async function PromiseSection({ market }: { market: Country }) {
  const t = await landingT('promise', market);
  return (
    <section
      id="promise"
      aria-labelledby="promise-title"
      className="mx-auto w-full max-w-7xl scroll-mt-28 px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      <Reveal className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-3 lg:col-span-5">
          <Eyebrow icon="handshake">{t('eyebrow')}</Eyebrow>
          <h2
            id="promise-title"
            className="font-display text-[1.75rem] font-bold leading-tight text-primary sm:text-headline-lg"
          >
            {t('title')}
          </h2>
          <p className="text-body-md text-on-surface-variant">{t('body')}</p>
          <Link
            href="/proof"
            className="inline-flex min-h-12 w-fit items-center gap-1 font-semibold text-primary underline underline-offset-4"
          >
            {t('proofLink')}
            <Icon name="arrow_forward" className="text-base" />
          </Link>
        </div>
        <div className="rounded-xl bg-surface p-5 shadow-1 sm:p-6 lg:col-span-7">
          <IsIsNot market={market} />
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/** The dark closing band: the two scenes and the way to your own family. */
export async function CtaBand({ market }: { market: Country }) {
  const t = await landingT('cta', market);
  const sg = market === 'SG';
  return (
    <section
      aria-labelledby="cta-title"
      className="bg-brand-ink px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8"
    >
      <Reveal className="mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <Icon name="security" className="text-sm text-secondary-fixed" />
          {t('chip')}
        </span>
        <h2
          id="cta-title"
          className="font-display text-[2rem] font-bold leading-tight tracking-[-0.02em] sm:text-headline-xl"
        >
          {t('title')}
        </h2>
        <p className="max-w-2xl text-body-lg text-white/85">{t('body')}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={{
              pathname: '/desk',
              query: { demo: '1', ...(sg ? { scene: 'singapore' } : {}) },
            }}
            className="btn-solid btn-accent flex min-h-14 items-center gap-2 rounded-md bg-accent px-6 text-title-md font-bold text-accent-ink hover:bg-accent-hover"
          >
            <Icon name="local_hospital" fill className="text-xl" />
            {t('hospital')}
          </Link>
          <Link
            href={{
              pathname: '/desk',
              query: { demo: '1', ...(sg ? {} : { scene: 'maternity' }) },
            }}
            className="press flex min-h-14 items-center gap-2 rounded-md bg-white/10 px-6 text-title-md font-bold text-white hover:bg-white/20"
          >
            <Icon name={sg ? 'travel_explore' : 'pregnant_woman'} className="text-xl" />
            {t('maternity')}
          </Link>
          <Link
            href="/sign-in"
            className="press flex min-h-14 items-center gap-2 rounded-md px-4 text-title-md font-semibold text-white underline-offset-4 hover:underline"
          >
            {t('own')}
            <Icon name="arrow_forward" className="text-lg" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------------------------------------------------- */
/** The footer: brand, real links, the rules' sources and the global disclaimer verbatim. */
export async function LandingFooter({
  market,
  wordings,
  checked,
  masterUrl,
}: {
  market: Country;
  wordings?: number;
  checked?: number;
  /** India: the IRDAI master circular. Singapore: MOH's MediShield Life page. */
  masterUrl?: string;
}) {
  const t = await landingT('footer', market);
  const te = await getTranslations('common.evidence');
  const tp = await getTranslations('landing.promise');
  const sg = market === 'SG';
  const tryLinks: { href: Href; label: string }[] = [
    {
      href: { pathname: '/desk', query: { demo: '1', ...(sg ? { scene: 'singapore' } : {}) } },
      label: t('desk'),
    },
    {
      href: { pathname: '/desk', query: { demo: '1', ...(sg ? {} : { scene: 'maternity' }) } },
      label: t('maternity'),
    },
    { href: '/demo', label: t('demo') },
    { href: '/home', label: t('cover') },
    { href: '/claims', label: t('claim') },
  ];
  const linkClass =
    'inline-flex min-h-12 items-center text-body-sm text-on-surface-variant transition-colors hover:text-primary';

  return (
    <footer className="border-t border-surface-container-high bg-surface-container-low px-4 pb-8 pt-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-md bg-white p-0.5 shadow-1">
                <LogoMark className="size-8" />
              </span>
              <span className="font-display text-headline-sm font-bold text-primary">Kavach</span>
              <span
                lang="hi"
                className="rounded-sm bg-surface-container px-2 py-0.5 font-display text-xs font-bold text-primary"
              >
                कवच
              </span>
            </div>
            <p className="max-w-md text-body-md text-on-surface-variant">{t('about')}</p>
            <p className="flex items-center gap-2 pt-1 text-label-caps font-semibold uppercase text-safe">
              <Icon name="security" className="text-sm" />
              {t('dpdp')}
            </p>
          </div>
          <nav aria-labelledby="footer-try">
            <h2 id="footer-try" className="mb-2 font-display text-title-md">
              {t('tryTitle')}
            </h2>
            <ul>
              {tryLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-labelledby="footer-evidence">
            <h2 id="footer-evidence" className="mb-2 font-display text-title-md">
              {t('evidenceTitle')}
            </h2>
            <ul>
              <li>
                <Link href="/proof" className={linkClass}>
                  {t('proof')}
                </Link>
              </li>
              {masterUrl && (
                <li>
                  <a href={masterUrl} target="_blank" rel="noreferrer" className={linkClass}>
                    {t('master')}
                  </a>
                </li>
              )}
              <li>
                <a href="#promise" className={linkClass}>
                  {tp('eyebrow')}
                </a>
              </li>
              <li>
                <Link href="/sign-in" className={linkClass}>
                  {t('signIn')}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-surface-container pt-6 font-serif text-citation-sm text-on-surface-variant">
          {sg ? (
            <p>
              {te('sources')} <span className="font-semibold text-primary">{t('sources')}</span>
            </p>
          ) : (
            <p>
              {te('sources')} <span className="font-semibold text-primary">{te('irdai2024')}</span>
              {' · '}
              <span className="font-semibold text-primary">{te('irdai2020')}</span>
            </p>
          )}
          {!sg && wordings !== undefined && (
            <p>{te('wordings', { count: wordings, checked: checked ?? 0 })}</p>
          )}
          <DisclaimerBar kind="global" className="font-sans" />
          <p className="flex flex-col justify-between gap-2 sm:flex-row">
            <span>{t('built')}</span>
            <span className="flex items-center gap-1 font-sans text-label-caps uppercase text-safe">
              <Icon name="science" className="text-sm" />
              {t('prototype')}
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
