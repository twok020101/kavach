'use client';

import { useMutation } from '@tanstack/react-query';
import { ShieldCheck, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { firebaseEnabled, signInAsGuest, signInWithGoogle } from '@/lib/firebase';
import { startDemo } from '@/lib/session';
import { acceptInvite, useInvitePreview } from '@/lib/setup';
import { useQueryClient } from '@tanstack/react-query';

export function SignInScreen({ invite }: { invite: string | null }) {
  const t = useTranslations('setup.signIn');
  const ts = useTranslations('setup');
  const router = useRouter();
  const queryClient = useQueryClient();
  const preview = useInvitePreview(invite);

  // Signing in, then: join the inviting family, or start setting up your own.
  const signIn = useMutation({
    mutationFn: async (how: 'google' | 'guest') => {
      if (how === 'google') await signInWithGoogle();
      else await signInAsGuest();
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
      {firebaseEnabled && (
        <Button
          size="lg"
          loading={signIn.isPending && signIn.variables === 'google'}
          onClick={() => signIn.mutate('google')}
        >
          <GoogleMark />
          {invite ? t('join') : t('google')}
        </Button>
      )}
      <Button
        size="lg"
        variant={firebaseEnabled ? 'secondary' : 'primary'}
        loading={signIn.isPending && signIn.variables === 'guest'}
        onClick={() => signIn.mutate('guest')}
      >
        {invite && !firebaseEnabled ? t('join') : firebaseEnabled ? t('guest') : ts('continue')}
      </Button>
      <p className="text-sm text-muted">{firebaseEnabled ? t('guestNote') : t('localMode')}</p>
      {signIn.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </div>
  );

  if (invite) {
    return (
      <SetupFrame
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
          <p className="rounded-md bg-gap-bg p-3 text-gap">{t('inviteGone')}</p>
        ) : (
          preview.data && (
            <>
              <Card className="flex items-center gap-4">
                <span className="flex size-14 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <Users aria-hidden className="size-7" />
                </span>
                <p className="text-lg">{t('invitedAs', { name: preview.data.memberName })}</p>
              </Card>
              {buttons}
            </>
          )
        )}
      </SetupFrame>
    );
  }

  return (
    <SetupFrame title={t('title')} intro={t('intro')}>
      <div className="panel flex items-center gap-3">
        <ShieldCheck aria-hidden className="size-8 shrink-0" />
        <p className="font-medium">{ts('consent.promise')}</p>
      </div>
      {buttons}
      <p className="mt-auto border-t border-border pt-4 text-muted">
        {t('demo')}{' '}
        <button
          className="font-semibold text-primary underline disabled:opacity-50"
          disabled={demo.isPending}
          onClick={() => demo.mutate()}
        >
          {t('demoLink')}
        </button>
      </p>
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
