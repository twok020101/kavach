'use client';

import { ConsentPurpose, type Locale } from '@kavach/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { AuthTabs, focusTab, tabPanelProps } from '@/components/auth/auth-tabs';
import { GoogleMark } from '@/components/auth/google-mark';
import { DisabledField, NotOnPanel } from '@/components/auth/not-on-panel';
import { SplitFrame } from '@/components/kavach/brand-panel';
import { Icon } from '@/components/kavach/icon';
import { Button, buttonClasses } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { firebaseEnabled, signInAsGuest } from '@/lib/firebase';
import { startDemo } from '@/lib/session';
import { marketForLocale } from '@/lib/market';
import { acceptInvite, useInvitePreview } from '@/lib/setup';

/**
 * The sample families at their `setup` checkpoints (data/personas/sharma.json, tan.json): the
 * Sharmas are 5 people with 4 policies; the Tans 5 people with 7 (a MediShield Life each, a
 * Shield plan and a term policy).
 */
const DEMO_COUNTS = { IN: { people: 5, policies: 4 }, SG: { people: 5, policies: 7 } };
/** The Twilio sandbox number, when WhatsApp is set up (as on the member home). */
const WA_NUMBER = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER?.replace(/\D/g, '');

type Method = 'quick' | 'otp' | 'abha';
const TABS_ID = 'sign-in';

/** Goes through the launch moment, then to `next` (a path without the locale). */
const launch = (next: string) => `/launch?next=${encodeURIComponent(next)}`;

/**
 * S02 Sign in (Stitch "sign in / family access"): the split frame, and on the right one white
 * card: a true status row, the headline, three sign-in methods as tabs (Quick access works; mobile
 * OTP and ABHA are designed but honestly switched off), the privacy promise, the ways in, the
 * two sample families (the Sharmas in India, the Tans in Singapore), three plain facts, and help
 * for someone already at the hospital.
 */
export function SignInScreen({ invite }: { invite: string | null }) {
  const t = useTranslations('setup.signIn');
  const ts = useTranslations('setup');
  const router = useRouter();
  const queryClient = useQueryClient();
  const preview = useInvitePreview(invite);
  const [method, setMethod] = useState<Method>('quick');
  const locale = useLocale() as Locale;
  // Mandarin and Malay readers are in Singapore: their sample family comes first. The Singapore
  // scene opens in the reader's language, or in Mandarin from Hindi (an India language).
  const sgFirst = marketForLocale(locale) === 'SG';
  const sg = sgFirst;
  // India signs in with ABHA, Singapore with Singpass: both designed, both switched off here.
  const id = sg ? 'singpass' : 'abha';
  const sgLocale: Locale = marketForLocale(locale) === 'IN' ? 'zh' : locale;

  // Signing in, then: join the inviting family, or start setting up your own. Google sign-in
  // is off in this hackathon prototype; the guest login (kept on this device) is the way in.
  const signIn = useMutation({
    mutationFn: async () => {
      await signInAsGuest();
      if (invite) {
        await acceptInvite(invite);
        queryClient.clear();
        return '/home';
      }
      return '/setup/consent';
    },
    onSuccess: (next) => router.push(launch(next)),
  });
  const demo = useMutation({
    mutationFn: () => startDemo('setup'),
    onSuccess: () => {
      queryClient.clear();
      router.push(launch('/home'));
    },
  });

  const quickAccess = (
    <div className="flex flex-col gap-4">
      <PrivacyPromise title={t('promiseTitle')} pill={t('promisePill')}>
        {ts('consent.promise')}
      </PrivacyPromise>
      {/* The way in, with what it does in one quiet line under it. */}
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="sign-in-cta w-full rounded-xl"
          loading={signIn.isPending}
          onClick={() => signIn.mutate()}
          aria-describedby="quick-note"
        >
          <span className="font-display">
            {invite ? t('join') : firebaseEnabled ? t('guest') : t('continueShield')}
          </span>
          <Icon name="arrow_forward" className="btn-arrow text-xl" />
        </Button>
        <AuthNote id="quick-note" icon="bolt">
          {firebaseEnabled ? t('guestNote') : t('localMode')}
        </AuthNote>
      </div>
      {/* Shown, not hidden, so it is clear the account option exists but is off for now. */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled
          aria-describedby="google-off"
          className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-border bg-surface text-on-surface-variant"
        >
          <GoogleMark className="size-5 opacity-60" />
          <span className="font-display text-title-md">{t('google')}</span>
        </button>
        <AuthNote id="google-off" icon="toggle_off">
          {t('googleOff')}
        </AuthNote>
      </div>
      {signIn.isError && (
        <p role="alert" className="panel panel-gap text-gap">
          {ts('error')}
        </p>
      )}
    </div>
  );

  const backToQuick = () => {
    setMethod('quick');
    focusTab(TABS_ID, 'quick');
  };

  if (invite) {
    return (
      <SignInCard back="/" statusChip={t('statusChip')} dpdp={t(sg ? 'dpdpSg' : 'dpdp')}>
        <h1 className="font-display text-[1.75rem] font-bold leading-9 tracking-[-0.015em] text-on-surface sm:text-headline-lg">
          {preview.data
            ? t('invited', {
                inviter: preview.data.inviterName,
                household: preview.data.householdName,
              })
            : ts('loading')}
        </h1>
        {preview.isError ? (
          <p role="alert" className="panel panel-gap text-gap">
            {t('inviteGone')}
          </p>
        ) : (
          preview.data && (
            <>
              <p className="flex items-center gap-4 rounded-lg bg-surface-container-low p-4 text-body-lg text-on-surface">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon name="family_restroom" className="text-2xl" />
                </span>
                {t('invitedAs', { name: preview.data.memberName })}
              </p>
              {quickAccess}
            </>
          )
        )}
      </SignInCard>
    );
  }

  return (
    <SignInCard back="/" statusChip={t('statusChip')} dpdp={t(sg ? 'dpdpSg' : 'dpdp')}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[1.75rem] font-bold leading-9 tracking-[-0.015em] text-on-surface sm:text-headline-lg">
          {t('title')}
        </h1>
        <p className="text-body-lg text-on-surface-variant">{t('intro')}</p>
      </div>

      <div className="flex flex-col gap-5">
        <AuthTabs
          base={TABS_ID}
          label={t('tabsLabel')}
          value={method}
          onChange={setMethod}
          tabs={[
            { id: 'quick', label: t('tabs.quick') },
            { id: 'otp', label: t('tabs.otp') },
            { id: 'abha', label: t(`tabs.${id}`) },
          ]}
        />
        <div {...tabPanelProps(TABS_ID, 'quick', method)} className="auth-panel">
          {quickAccess}
        </div>
        <div {...tabPanelProps(TABS_ID, 'otp', method)} className="auth-panel">
          <NotOnPanel
            title={t('otp.title')}
            badge={t('offBadge')}
            action={t('otp.send')}
            note={{ id: 'otp-off', text: t('otp.off') }}
            backLabel={t('useQuick')}
            onBack={backToQuick}
            field={
              <DisabledField
                id="otp-phone"
                label={t('otp.phone')}
                prefix={sgFirst ? '+65' : '+91'}
                inputMode="tel"
                describedBy="otp-off"
              />
            }
          />
        </div>
        <div {...tabPanelProps(TABS_ID, 'abha', method)} className="auth-panel">
          <NotOnPanel
            title={t(`${id}.title`)}
            badge={t('offBadge')}
            action={t(`${id}.continue`)}
            note={{ id: 'abha-off', text: t(`${id}.off`) }}
            backLabel={t('useQuick')}
            onBack={backToQuick}
            field={
              <DisabledField
                id="abha-number"
                label={t(`${id}.label`)}
                hint={t(`${id}.what`)}
                placeholder={sg ? 'S0000000A' : '00-0000-0000-0000'}
                inputMode={sg ? 'text' : 'numeric'}
                describedBy="abha-off"
              />
            }
          />
        </div>
      </div>

      {/* The two sample families, each a row of its own: the reader's market first. The Sharmas
          open the app; the Tans open the Singapore desk scene. Both rows share one shape:
          monogram, market eyebrow, title, counts, and the way in under the words. */}
      <section aria-labelledby="demo-heading" className="flex flex-col gap-3">
        <h2 id="demo-heading" className="text-label-caps uppercase text-on-surface-variant">
          {t('demo')}
        </h2>
        {(sgFirst ? (['sg', 'in'] as const) : (['in', 'sg'] as const)).map((which) =>
          which === 'in' ? (
            <DemoRow
              key="in"
              id="demo-in"
              initial={t('demoCard.initial')}
              kicker={t('demoCard.kicker')}
              title={t('demoCard.title')}
              meta={t('demoCard.meta', DEMO_COUNTS.IN)}
            >
              <Button
                variant="soft"
                loading={demo.isPending}
                onClick={() => demo.mutate()}
                className={DEMO_BUTTON}
              >
                {t('demoCard.open')}
                <Icon name="arrow_forward" className="btn-arrow text-lg" />
              </Button>
            </DemoRow>
          ) : (
            <DemoRow
              key="sg"
              id="demo-sg"
              initial={t('demoCardSg.initial')}
              kicker={t('demoCardSg.kicker')}
              title={t('demoCardSg.title')}
              meta={t('demoCard.meta', DEMO_COUNTS.SG)}
            >
              <Link
                href={{ pathname: '/desk', query: { demo: '1', scene: 'singapore' } }}
                locale={sgLocale}
                className={buttonClasses({ variant: 'soft', className: DEMO_BUTTON })}
              >
                {t('demoCardSg.open')}
                <Icon name="arrow_forward" className="btn-arrow text-lg" />
              </Link>
            </DemoRow>
          ),
        )}
      </section>
      {demo.isError && (
        <p role="alert" className="panel panel-gap -mt-2 text-gap">
          {ts('error')}
        </p>
      )}

      <FactsStrip
        title={t('facts.title')}
        chip={t('facts.chip')}
        facts={[
          { value: routing.locales.length, label: t('facts.languages'), tone: 'text-primary' },
          {
            value: ConsentPurpose.options.length,
            label: t('facts.purposes'),
            tone: 'text-safe',
          },
          { value: 0, label: t('facts.sold'), tone: 'text-secondary' },
        ]}
      />

      {/* Help for someone already at the hospital, and WhatsApp when it is set up. */}
      <nav className="-mb-2 flex flex-wrap items-center gap-x-6 border-t border-border/70 pt-2">
        <Link
          href="/desk"
          className="inline-flex min-h-12 items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <Icon name="emergency" className="text-lg text-error" />
          {t('help.hospital')}
        </Link>
        {WA_NUMBER && (
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            className="inline-flex min-h-12 items-center gap-1.5 text-on-surface-variant underline-offset-4 hover:text-on-surface hover:underline"
          >
            <Icon name="chat" className="text-lg text-tertiary" />
            {t('help.whatsapp')}
          </a>
        )}
      </nav>
    </SignInCard>
  );
}

const DEMO_BUTTON =
  'min-h-12 bg-surface-container-highest px-4 text-primary hover:bg-primary hover:text-on-primary';

/**
 * One sample family as a row: its monogram, the market as an eyebrow, the title over the full
 * width (never squeezed beside the button), then the counts and the way in.
 */
function DemoRow({
  id,
  initial,
  kicker,
  title,
  meta,
  children,
}: {
  id: string;
  initial: string;
  kicker: string;
  title: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <article
      aria-labelledby={id}
      className="flex items-start gap-4 rounded-lg bg-surface-container-low p-4 sm:p-5"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary-fixed font-display text-headline-sm font-bold text-secondary"
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-label-caps uppercase text-secondary">{kicker}</span>
          <h3 id={id} className="font-display text-title-md text-on-surface">
            {title}
          </h3>
        </div>
        {/* The counts and the way in share a line when there is room, and stack when not. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <p className="text-body-sm text-on-surface-variant">{meta}</p>
          {children}
        </div>
      </div>
    </article>
  );
}

/** A quiet one-line note under an action: its icon and the words, in one size everywhere. */
function AuthNote({ id, icon, children }: { id: string; icon: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-2 px-1 text-body-sm text-on-surface-variant">
      <Icon name={icon} className="mt-px text-base text-secondary" />
      <span className="max-w-[60ch]">{children}</span>
    </p>
  );
}

/** The split frame with the white sign-in card and its status row. */
function SignInCard({
  back,
  statusChip,
  dpdp,
  children,
}: {
  back: string;
  statusChip: string;
  dpdp: string;
  children: ReactNode;
}) {
  return (
    <SplitFrame back={back}>
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        {/* On a phone the page is the card; from a tablet up the white card sits on the page. */}
        <div className="auth-card stagger flex flex-col gap-6 pt-2 sm:rounded-xl sm:bg-surface sm:p-8 sm:shadow-[0_4px_24px_rgba(13,26,60,0.06)] sm:ring-1 sm:ring-border/50 lg:p-10">
          {/* Two true badges, one shape: what this is (a prototype on demo data) and the
              privacy law it is built to for the reader's market (DPDP in India, PDPA in
              Singapore). Neither is a certification. */}
          <ul className="flex flex-wrap items-center gap-2">
            <li className="auth-badge bg-surface-container text-primary">
              <span className="live-dot" />
              {statusChip}
            </li>
            <li className="auth-badge bg-safe-bg text-safe">
              <Icon name="shield" fill className="text-sm" />
              {dpdp}
            </li>
          </ul>
          {children}
        </div>
      </main>
    </SplitFrame>
  );
}

/** The privacy promise with its green shield tile and the "Zero selling" pill. */
function PrivacyPromise({
  title,
  pill,
  children,
}: {
  title: string;
  pill: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="privacy-promise"
      className="flex items-start gap-4 rounded-lg bg-surface-container-low p-4"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-tertiary-fixed text-tertiary shadow-1">
        <Icon name="security" fill className="text-xl" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 id="privacy-promise" className="font-display text-title-md text-on-surface">
            {title}
          </h2>
          <span className="rounded-[4px] bg-tertiary/10 px-1.5 py-0.5 text-label-caps uppercase text-tertiary">
            {pill}
          </span>
        </div>
        <p className="text-body-md text-on-surface-variant">{children}</p>
      </div>
    </section>
  );
}

/** Three true facts in the Stitch stat-tile slot, with a live "Prototype" chip. */
function FactsStrip({
  title,
  chip,
  facts,
}: {
  title: string;
  chip: string;
  facts: { value: number; label: string; tone: string }[];
}) {
  return (
    <section
      aria-labelledby="facts-title"
      className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-1 ring-1 ring-border/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="facts-title"
          className="inline-flex items-center gap-2 font-display text-title-md text-on-surface"
        >
          <Icon name="fact_check" className="text-lg text-primary" />
          {title}
        </h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-tertiary-fixed px-2.5 py-0.5 text-label-caps uppercase text-tertiary">
          <span className="live-dot" />
          {chip}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="flex flex-col-reverse items-center justify-end gap-0.5 rounded-md bg-surface-container-low px-1.5 py-2.5 text-center"
          >
            <dt className="text-label-caps uppercase text-on-surface-variant">{fact.label}</dt>
            <dd className={`font-display text-headline-md font-bold tabular-nums ${fact.tone}`}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
