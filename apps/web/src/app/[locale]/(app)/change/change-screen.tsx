'use client';

import type { ChangeSet, Household, Locale } from '@kavach/schemas';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { capsLabel, PageHeader } from '@/components/app/page-parts';
import { Icon } from '@/components/kavach/icon';
import { Button } from '@/components/ui/button';
import { useCountry } from '@/lib/country';
import { ChangeConfirm } from '@/components/plan/change-confirm';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useParseChange, useRecordChange } from '@/components/plan/queries';
import { Sheet } from '@/components/plan/sheet';
import { useRouter } from '@/i18n/navigation';

const CHIPS = ['newJob', 'baby', 'parents', 'car', 'trip', 'loan'] as const;

export function ChangeScreen() {
  return <PlanFrame>{(household) => <Change household={household} />}</PlanFrame>;
}

function Change({ household }: { household: Household }) {
  const t = useTranslations('plan.change');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const country = useCountry();
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ChangeSet>();
  const parse = useParseChange(household.id);
  const record = useRecordChange(household.id);

  const check = () =>
    parse.mutate({ text, locale }, { onSuccess: (changeSet) => setDraft(changeSet) });
  const confirm = (changeSet: ChangeSet) =>
    record.mutate({ changeSet, text }, { onSuccess: ({ id }) => router.push(`/change/${id}`) });

  // The examples name the Sharma family's job and loan; a Singapore family gets its own.
  const example = (chip: (typeof CHIPS)[number]) =>
    country === 'SG' && (chip === 'newJob' || chip === 'loan')
      ? t(`examplesSg.${chip}`)
      : t(`examples.${chip}`);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t('title')} intro={t('intro')} />
      <form
        className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-1 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim().length >= 3) check();
        }}
      >
        <label className="flex flex-col gap-2">
          <span className="sr-only">{t('label')}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={t('placeholder')}
            className="min-h-28 rounded-md border border-border-strong bg-surface p-3 text-body-lg text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className={capsLabel}>{t('common')}</span>
          <ul className="flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <li key={chip}>
                <button
                  type="button"
                  onClick={() => setText(example(chip))}
                  className="press min-h-12 rounded-full border border-border bg-surface-container-low px-4 text-body-sm text-on-surface transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {t(`chips.${chip}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {parse.isError && (
          <p role="alert" className="rounded-md bg-gap-bg p-3 text-body-md text-gap">
            {t('parseError')}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto sm:self-start"
          loading={parse.isPending}
          disabled={text.trim().length < 3}
        >
          <Icon name="auto_awesome" className="text-xl" />
          {t('check')}
        </Button>
      </form>

      <Sheet open={!!draft} onClose={() => setDraft(undefined)} title={t('understood')}>
        {draft && (
          <ChangeConfirm
            household={household}
            changeSet={draft}
            saving={record.isPending}
            failed={record.isError}
            onEdit={() => setDraft(undefined)}
            onConfirm={confirm}
          />
        )}
      </Sheet>
    </div>
  );
}
