'use client';

import type { Locale } from '@kavach/schemas';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, FileWarning, History, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AnswerCard } from '@/components/kavach/answer-card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { Spinner } from '@/components/ui/spinner';
import { Link } from '@/i18n/navigation';
import { deskClient } from '@/lib/desk-client';
import { DeskHeader } from './desk-header';

/** S24: what Kavach advised, in both languages, saved for the family. */
export function DeskSummaryScreen({ sid }: { sid: string }) {
  const t = useTranslations('desk.summary');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const other: Locale = locale === 'hi' ? 'en' : 'hi';
  const [copied, setCopied] = useState(false);

  // Ending is idempotent, so the summary can be fetched again after a reload.
  const result = useQuery({ queryKey: ['desk', 'end', sid], queryFn: () => deskClient.end(sid) });
  const household = useQuery({ queryKey: ['desk', 'household'], queryFn: deskClient.getHousehold });
  const patient = household.data?.members.find(
    (m) => m.id === result.data?.session.patientMemberId,
  );
  const answer = result.data?.session.lastAnswer;
  const summary = result.data?.summary;

  async function share() {
    if (!summary) return;
    const text = `${summary[locale]}\n\n${summary[other]}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      // Share sheet closed.
    }
  }

  return (
    <>
      <DeskHeader title={t('title')} subtitle={result.data?.session.hospitalName} />
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-12 pt-5">
        {result.isPending ? (
          <Spinner label={tc('loading')} />
        ) : (
          <>
            <Card as="section" aria-labelledby="summary-title" className="flex flex-col gap-3">
              <h2
                id="summary-title"
                className="flex items-center gap-2 font-display text-xl font-bold"
              >
                <CircleCheck aria-hidden className="size-6 text-safe" />
                {patient
                  ? t('heading', { name: patient.name.split(' ')[0] ?? patient.name })
                  : t('title')}
              </h2>
              {summary?.[locale] ? (
                <>
                  <p className="text-lg">{summary[locale]}</p>
                  <Disclosure label={t('otherLanguage')}>
                    <p lang={other} className="text-lg">
                      {summary[other]}
                    </p>
                  </Disclosure>
                </>
              ) : (
                <p className="text-lg">{t('empty')}</p>
              )}
              <Badge icon={History} tone="primary" className="self-start">
                {t('saved')}
              </Badge>
            </Card>

            {answer && (
              <section aria-label={t('cards')} className="flex flex-col gap-4">
                {answer.cards.map((card, i) => (
                  <AnswerCard key={card.id} card={card} index={i} />
                ))}
              </section>
            )}

            <Card as="section" className="flex items-start gap-3">
              <FileWarning aria-hidden className="mt-1 size-6 shrink-0 text-primary" />
              <p>
                {t('claimHint')}{' '}
                <Link href="/claims" className="font-semibold text-primary underline">
                  {t('claimLink')}
                </Link>
              </p>
            </Card>

            <div className="flex flex-col gap-3">
              {summary?.[locale] && (
                <Button size="desk" onClick={share}>
                  <Share2 aria-hidden className="size-6" />
                  {copied ? t('copied') : t('share')}
                </Button>
              )}
              <Link href="/desk" className={buttonClasses({ variant: 'secondary', size: 'desk' })}>
                {t('newSession')}
              </Link>
              <Link href="/" className={buttonClasses({ variant: 'ghost', size: 'desk' })}>
                {t('home')}
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
