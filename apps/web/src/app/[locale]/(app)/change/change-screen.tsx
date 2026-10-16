'use client';

import type { ChangeSet, Household, Locale } from '@kavach/schemas';
import { Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
  const [text, setText] = useState('');
  const [draft, setDraft] = useState<ChangeSet>();
  const parse = useParseChange(household.id);
  const record = useRecordChange(household.id);

  const check = () =>
    parse.mutate({ text, locale }, { onSuccess: (changeSet) => setDraft(changeSet) });
  const confirm = (changeSet: ChangeSet) =>
    record.mutate(
      { changeSet, text },
      { onSuccess: ({ id }) => router.push(`/change/${id}`) },
    );

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
      <label className="flex flex-col gap-2">
        <span className="sr-only">{t('label')}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t('placeholder')}
          className="rounded-md border-2 border-border bg-surface p-3 text-lg focus:border-primary focus:outline-none"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted">{t('common')}</span>
        <ul className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <li key={chip}>
              <button
                onClick={() => setText(t(`examples.${chip}`))}
                className="min-h-10 rounded-full border border-border bg-surface px-3 text-sm hover:border-primary hover:text-primary"
              >
                {t(`chips.${chip}`)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {parse.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{t('parseError')}</p>}
      <Button size="lg" onClick={check} loading={parse.isPending} disabled={text.trim().length < 3}>
        <Sparkles aria-hidden className="size-5" />
        {t('check')}
      </Button>

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
