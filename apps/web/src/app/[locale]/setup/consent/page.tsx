'use client';

import type { ConsentPurpose } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ConsentToggles } from '@/components/setup/consent-toggles';
import { SetupFrame } from '@/components/setup/setup-frame';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
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
      footer={
        <Button
          size="lg"
          disabled={!ready}
          loading={create.isPending}
          onClick={() => create.mutate(consents, { onSuccess: () => router.push('/setup/family') })}
        >
          {t('agree')}
        </Button>
      }
    >
      <ConsentToggles value={consents} onChange={setConsents} />
      {!ready && <p className="text-sm text-partial">{t('required')}</p>}
      <p className="rounded-md bg-sunken p-4 text-sm">{t('promise')}</p>
      {create.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </SetupFrame>
  );
}
