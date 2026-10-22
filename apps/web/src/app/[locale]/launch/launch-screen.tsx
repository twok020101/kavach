'use client';

import { useTranslations } from 'next-intl';
import { type CSSProperties, useEffect } from 'react';
import { SplitFrame } from '@/components/kavach/brand-panel';
import { Icon } from '@/components/kavach/icon';
import { useRouter } from '@/i18n/navigation';

/** How long the moment holds before the next screen opens (immediate under reduced motion). */
const HOLD_MS = 1200;

/**
 * The launch loader (Stitch "pre-landing gateway loader"): after signing in or opening the demo,
 * the brand panel stays and the right side says what just happened, with a spinning pill, then
 * the next screen replaces it (so Back never returns here). The words depend on where it leads:
 * a family with policies sees "Protection active"; a new sign-in on its way to setup does not.
 */
export function LaunchScreen({ next }: { next: string }) {
  const t = useTranslations('setup.launch');
  const router = useRouter();
  const toSetup = next.startsWith('/setup');
  const toHome = next === '/home' || next.startsWith('/home?');

  useEffect(() => {
    router.prefetch(next);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => router.replace(next), reduce ? 0 : HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [next, router]);

  const title = toSetup ? t('setupTitle') : t('homeTitle');
  const body = toSetup ? t('setupBody') : t('homeBody');
  const pill = toSetup ? t('setupPill') : toHome ? t('homePill') : t('otherPill');

  return (
    <SplitFrame query={{ next }}>
      <main
        id="main"
        className="flex flex-1 flex-col items-center justify-center py-16 text-center lg:py-10"
      >
        <span className="launch-seal relative mb-6 flex size-20 items-center justify-center rounded-full bg-safe-bg text-safe">
          <Icon name="verified_user" weight={500} className="text-[2.5rem]" />
        </span>
        <h1
          className="rise-in font-display text-headline-md text-on-surface sm:text-[1.75rem] sm:leading-9"
          style={{ '--i': 2 } as CSSProperties}
        >
          {title}
        </h1>
        <p
          className="rise-in mt-2 max-w-sm text-body-lg text-on-surface-variant"
          style={{ '--i': 3 } as CSSProperties}
        >
          {body}
        </p>
        <p
          role="status"
          className="rise-in mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-5 text-on-primary shadow-2"
          style={{ '--i': 4 } as CSSProperties}
        >
          <span className="font-display text-title-md">{pill}</span>
          <Icon name="refresh" weight={500} className="launch-spin text-lg" />
        </p>
      </main>
    </SplitFrame>
  );
}
