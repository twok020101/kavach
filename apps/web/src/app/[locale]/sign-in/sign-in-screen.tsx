'use client';

import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Info, ShieldCheck, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Reveal } from '@/components/kavach/reveal';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { firebaseEnabled, signInAsGuest } from '@/lib/firebase';
import { startDemo } from '@/lib/session';
import { acceptInvite, useInvitePreview } from '@/lib/setup';
import { useQueryClient } from '@tanstack/react-query';

/**
 * S02 Sign in. One card (from the Stitch sign-in): the promise with its shield tile first, then
 * the two ways in as full-width buttons, the local-mode note as a quiet row, and the demo as a
 * row of its own with the family's initial on a tile and "Open the demo" at its end. Sections
 * rise in order (Reveal), buttons stand on their base, errors stay in place.
 */
export function SignInScreen({ invite }: { invite: string | null }) {
  const t = useTranslations('setup.signIn');
  const ts = useTranslations('setup');
  const router = useRouter();
  const queryClient = useQueryClient();
  const preview = useInvitePreview(invite);

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
    onSuccess: (next) => router.push(next),
  });
  const demo = useMutation({
    mutationFn: () => startDemo('setup'),
    onSuccess: () => {
      queryClient.clear();
      router.push('/home');
    },
  });

  const buttons = (
    <div className="flex flex-col gap-3">
      <Button size="lg" loading={signIn.isPending} onClick={() => signIn.mutate()}>
        {invite ? t('join') : firebaseEnabled ? t('guest') : ts('continue')}
        <ArrowRight aria-hidden className="btn-arrow size-5" />
      </Button>
      {/* The note on how you get in: a quiet row with its icon, never a bare line. */}
      <p className="panel flex items-start gap-2 text-sm text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>{firebaseEnabled ? t('guestNote') : t('localMode')}</span>
      </p>
      {firebaseEnabled && (
        <div className="flex flex-col gap-1.5">
          {/* Shown, not hidden, so it is clear the account option exists but is off for now. */}
          <Button size="lg" variant="secondary" disabled aria-describedby="google-off">
            <GoogleMark />
            {t('google')}
          </Button>
          <p id="google-off" className="text-sm text-muted">
            {t('googleOff')}
          </p>
        </div>
      )}
      {signIn.isError && (
        <p role="alert" className="panel panel-gap text-gap">
          {ts('error')}
        </p>
      )}
    </div>
  );

  if (invite) {
    return (
      <SetupFrame
        back="/"
        title={
          preview.data
            ? t('invited', {
                inviter: preview.data.inviterName,
                household: preview.data.householdName,
              })
            : ts('loading')
        }
      >
        {preview.isError ? (
          <p role="alert" className="panel panel-gap text-gap">
            {t('inviteGone')}
          </p>
        ) : (
          preview.data && (
            <Card className="flex flex-col gap-6 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 sm:rounded-lg sm:p-6 lg:p-8">
              <Reveal>
                <Card tone="soft" className="flex items-center gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    <Users aria-hidden className="size-7" />
                  </span>
                  <p className="text-lg">{t('invitedAs', { name: preview.data.memberName })}</p>
                </Card>
              </Reveal>
              <Reveal delay={0.06}>{buttons}</Reveal>
            </Card>
          )
        )}
      </SetupFrame>
    );
  }

  return (
    <SetupFrame back="/" title={t('title')} intro={t('intro')}>
      {/* On a phone the page is the card; from a tablet up the card sits on the page. */}
      <Card className="flex flex-col gap-6 max-sm:border-0 max-sm:bg-transparent max-sm:p-0 sm:rounded-lg sm:p-6 lg:p-8">
        <Reveal>
          <Card tone="soft" className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-safe-bg text-safe">
              <ShieldCheck aria-hidden className="size-6" />
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="font-display text-lg font-bold leading-tight">{t('promiseTitle')}</p>
              <p className="text-muted">{ts('consent.promise')}</p>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.06}>{buttons}</Reveal>
        <Reveal delay={0.12}>
          {/* The demo as a row of its own (from the Stitch sign-in): the family's initial on a
              tile, what the demo holds, and one button at the end. */}
          <Card
            as="section"
            tone="soft"
            aria-labelledby="demo-title"
            className="flex flex-col gap-4"
          >
            <div className="flex min-w-0 items-start gap-4">
              <span
                aria-hidden
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-partial-bg font-display text-xl font-bold text-partial"
              >
                {t('demoCard.initial')}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="label text-primary-hover">{t('demoCard.kicker')}</span>
                <h2 id="demo-title" className="font-display text-lg font-bold leading-tight">
                  {t('demoCard.title')}
                </h2>
                <p className="text-sm text-muted">{t('demoCard.body')}</p>
              </div>
            </div>
            {/* The button sits under the words, in line with them (the column is too narrow
                for the Stitch side-by-side row once Hindi or Tamil labels come in). */}
            <Button
              variant="secondary"
              loading={demo.isPending}
              onClick={() => demo.mutate()}
              className="self-start sm:ml-16"
            >
              {t('demoCard.open')}
              <ArrowRight aria-hidden className="btn-arrow size-5" />
            </Button>
          </Card>
        </Reveal>
      </Card>
    </SetupFrame>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 rounded-full bg-white p-0.5">
      <path
        fill="#4285F4"
        d="M22 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.6a4.8 4.8 0 0 1-2.1 3.1v2.6h3.4c2-1.8 3.1-4.5 3.1-7.5z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.3H2.7v2.7A10 10 0 0 0 12 22z"
      />
      <path fill="#FBBC05" d="M6.2 13.6a6 6 0 0 1 0-3.8V7.1H2.7a10 10 0 0 0 0 9.2z" />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.9.5 4 1.5l3-3A10 10 0 0 0 2.7 7.1l3.5 2.7C7 7.8 9.3 6 12 6z"
      />
    </svg>
  );
}
