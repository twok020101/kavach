'use client';

import type { SmartQuestionId } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { Chip } from '@/components/setup/member-sheet';
import { SetupFrame, SetupLoadState } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { CountryProvider } from '@/lib/country';
import { useAnswer, useQuestions } from '@/lib/setup';

/** S08 Smart questions: at most three, each with why it matters; then the cover map. */
export default function QuestionsPage() {
  const t = useTranslations('setup.questions');
  const ts = useTranslations('setup');
  const router = useRouter();
  const setup = useSetupHousehold();
  const household = setup.data;
  const asked = useQuestions(household?.id);
  const questions = asked.data;
  // A failed load (the family's, or the questions') says so, with a retry, never a blank step.
  const loadError = setup.error ?? asked.error;
  const retry = () => (setup.error ? setup.refetch() : asked.refetch());
  const answer = useAnswer(household?.id);
  const [answers, setAnswers] = useState<Partial<Record<SmartQuestionId, string>>>({});

  const finish = () => {
    const go = () => router.push('/home?reveal=1');
    if (Object.keys(answers).length) answer.mutate(answers, { onSuccess: go });
    else go();
  };

  return (
    <SetupFrame
      step={4}
      back="/setup/documents"
      title={
        questions?.length ? (
          t('title', { count: questions.length })
        ) : questions ? (
          t('none')
        ) : (
          <>
            <span className="sr-only">{ts('loading')}</span>
            <span aria-hidden className="shimmer block h-9 w-64 max-w-full rounded-md" />
          </>
        )
      }
      intro={questions?.length ? t('intro') : questions ? t('noneIntro') : undefined}
      footer={
        <Button size="lg" disabled={!questions} loading={answer.isPending} onClick={finish}>
          {t('see')}
        </Button>
      }
    >
      {!questions && (
        <SetupLoadState
          error={loadError}
          retrying={setup.isFetching || asked.isFetching}
          onRetry={retry}
        />
      )}
      {/* Impacts in the family's own currency (S$ for a Singapore household). */}
      <CountryProvider country={household?.country}>
        <ol className="flex flex-col gap-3">
          {questions?.map((q) => (
            <Card as="li" key={q.id} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-headline-sm text-on-surface">
                  {t(`${q.id}.q`, { employer: 'none', ...q.params })}
                </h2>
                <p className="max-w-[65ch] text-body-md text-on-surface-variant">
                  {q.impact
                    ? t.rich('impact', { amount: () => <Amount value={q.impact!} /> })
                    : t(`${q.id}.why`)}
                </p>
              </div>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t(`${q.id}.q`, { employer: 'none', ...q.params })}
              >
                {q.options.map((option) => (
                  <Chip
                    key={option}
                    selected={answers[q.id] === option}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: option }))}
                  >
                    {t(`${q.id}.options.${option}`)}
                  </Chip>
                ))}
              </div>
            </Card>
          ))}
        </ol>
      </CountryProvider>
      {answer.isError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-gap-bg p-4 text-gap">
          <Icon name="error" className="mt-0.5 text-lg" />
          {ts('error')}
        </p>
      )}
    </SetupFrame>
  );
}
