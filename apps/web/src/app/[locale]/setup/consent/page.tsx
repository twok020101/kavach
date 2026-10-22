'use client';

import { ConsentPurpose, type Locale } from '@kavach/schemas';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Icon } from '@/components/kavach/icon';
import { ConsentToggles } from '@/components/setup/consent-toggles';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button, buttonClasses } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { marketForLocale } from '@/lib/market';
import { useCreateHousehold } from '@/lib/setup';

/**
 * S03 Consent (Stitch "DPDP statutory consent"): a separate yes for each purpose before any
 * personal or health data, the promise, and a footer with the live count, Back and Agree. A
 * Singapore reader (Mandarin, Malay) is not told about India's DPDP Act: the chip and intro say
 * what is true everywhere, one yes per purpose (`chipSg`, `introSg`).
 */
export default function ConsentPage() {
  const t = useTranslations('setup.consent');
  const ts = useTranslations('setup');
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentPurpose[]>(['planning', 'documents']);
  const create = useCreateHousehold();
  const ready = consents.includes('planning');
  const sg = marketForLocale(useLocale() as Locale) === 'SG';

  return (
    <SetupFrame
      back="/sign-in"
      top={
        // What this screen is, and that the choice is not final (both true).
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1.5 text-label-caps uppercase text-on-surface-variant">
            <Icon name="policy" className="text-base text-primary" />
            {t(sg ? 'chipSg' : 'chip')}
          </span>
          <span className="inline-flex items-center gap-1.5 font-serif text-citation-sm text-on-surface-variant">
            <Icon name="check_circle" className="text-base text-tertiary" />
            {t('changeNote')}
          </span>
        </div>
      }
      title={t('title')}
      intro={t(sg ? 'introSg' : 'intro')}
      footer={
        // The live count on the left, Back and the one primary action on the right (Stitch 04).
        <div className="flex w-full flex-wrap items-center gap-3">
          <p
            className="basis-full text-body-md text-on-surface-variant sm:mr-auto sm:basis-auto"
            aria-live="polite"
          >
            {t('count', { on: consents.length, total: ConsentPurpose.options.length })}
          </p>
          <Link href="/sign-in" className={buttonClasses({ variant: 'soft', size: 'lg' })}>
            {ts('back')}
          </Link>
          <Button
            size="lg"
            className="flex-1 sm:flex-none sm:px-8"
            disabled={!ready}
            loading={create.isPending}
            onClick={() =>
              create.mutate(consents, { onSuccess: () => router.push('/setup/family') })
            }
          >
            {t('agree')}
            <Icon name="arrow_forward" className="btn-arrow text-xl" />
          </Button>
        </div>
      }
    >
      <ConsentToggles value={consents} onChange={setConsents} />
      {!ready && (
        <p role="status" className="flex items-start gap-2 text-body-md text-partial">
          <Icon name="error" className="mt-0.5 text-lg" />
          {t('required')}
        </p>
      )}

      {/* The promise: what Kavach never does with any of it, with its own tile. */}
      <section
        aria-labelledby="consent-promise"
        className="flex items-start gap-4 rounded-lg bg-surface-container-high/60 p-4 sm:p-5"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="verified" className="text-xl" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <h2 id="consent-promise" className="font-display text-title-md text-on-surface">
            {t('promiseTitle')}
          </h2>
          <p className="text-body-md text-on-surface-variant">
            {t.rich('guarantee', {
              b: (chunks) => <strong className="font-semibold text-on-surface">{chunks}</strong>,
            })}
          </p>
        </span>
      </section>
      {create.isError && (
        <p role="alert" className="rounded-md bg-gap-bg p-3 text-gap">
          {ts('error')}
        </p>
      )}
    </SetupFrame>
  );
}
