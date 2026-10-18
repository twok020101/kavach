'use client';

import { ConsentPurpose } from '@kavach/schemas';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConsentToggles } from '@/components/setup/consent-toggles';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useRouter } from '@/i18n/navigation';
import { useCreateHousehold } from '@/lib/setup';

/** S03 Consent: a separate yes for each purpose before any personal or health data. */
export default function ConsentPage() {
  const t = useTranslations('setup.consent');
  const ts = useTranslations('setup');
  const router = useRouter();
  const [consents, setConsents] = useState<ConsentPurpose[]>(['planning', 'documents']);
  const create = useCreateHousehold();
  const ready = consents.includes('planning');

  return (
    <SetupFrame
      back="/sign-in"
      title={t('title')}
      intro={t('intro')}
      stickyFooter
      footer={
        // The live count on the left, Back and the one primary action on the right (Stitch 04).
        <div className="flex w-full flex-wrap items-center gap-3">
          <p
            className="basis-full text-base text-muted sm:mr-auto sm:basis-auto"
            aria-live="polite"
          >
            {t('count', { on: consents.length, total: ConsentPurpose.options.length })}
          </p>
          <Link href="/sign-in" className={buttonClasses({ variant: 'soft', size: 'lg' })}>
            {ts('back')}
          </Link>
          <Button
            size="lg"
            className="flex-1 sm:flex-none"
            disabled={!ready}
            loading={create.isPending}
            onClick={() =>
              create.mutate(consents, { onSuccess: () => router.push('/setup/family') })
            }
          >
            {t('agree')}
            <ArrowRight aria-hidden className="size-5" />
          </Button>
        </div>
      }
    >
      <ConsentToggles value={consents} onChange={setConsents} />
      {!ready && <p className="text-base text-partial">{t('required')}</p>}

      {/* The promise: what Kavach never does with any of it, with its own tile. */}
      <Card tone="soft" as="section" aria-labelledby="consent-promise" className="flex gap-4">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"
        >
          <ShieldCheck className="size-6" />
        </span>
        <span className="flex min-w-0 flex-col gap-1">
          <h2 id="consent-promise" className="font-display text-lg font-bold">
            {t('promiseTitle')}
          </h2>
          <p className="text-base">{t('promise')}</p>
        </span>
      </Card>
      {create.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </SetupFrame>
  );
}
