'use client';

import type { SmartQuestionId } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Chip } from '@/components/setup/member-sheet';
import { SetupFrame } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@/i18n/navigation';
import { useAnswer, useQuestions } from '@/lib/setup';

/** S08 Smart questions: at most three, each with why it matters; then the cover map. */
export default function QuestionsPage() {
  const t = useTranslations('setup.questions');
  const ts = useTranslations('setup');
  const router = useRouter();
  const { data: household } = useSetupHousehold();
  const { data: questions } = useQuestions(household?.id);
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
        questions?.length ? t('title', { count: questions.length }) : questions ? t('none') : ''
      }
      intro={questions?.length ? t('intro') : questions ? t('noneIntro') : undefined}
      footer={
        <Button size="lg" disabled={!questions} loading={answer.isPending} onClick={finish}>
          {t('see')}
        </Button>
      }
    >
      {!questions && (
        <p className="flex items-center gap-2 text-muted">
          <Spinner /> {ts('loading')}
        </p>
      )}
      <ol className="flex flex-col gap-3">
        {questions?.map((q) => (
          <Card as="li" key={q.id} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-lg font-semibold">
                {t(`${q.id}.q`, { employer: 'none', ...q.params })}
              </h2>
              <p className="text-sm text-muted">
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
      {answer.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </SetupFrame>
  );
}
