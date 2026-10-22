'use client';

import type { Locale } from '@kavach/schemas';
import { useQuery } from '@tanstack/react-query';
import { CircleCheck, FileWarning, History, RotateCw, Share2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { AnswerCard } from '@/components/kavach/answer-card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { CountryProvider } from '@/lib/country';
import { deskClient } from '@/lib/desk-client';
import { DeskHeader } from './desk-header';

/** S24: what Kavach advised, in both languages, saved for the family. */
export function DeskSummaryScreen({ sid }: { sid: string }) {
  const t = useTranslations('desk.summary');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const [copied, setCopied] = useState(false);

  // Ending is idempotent, so the summary can be fetched again after a reload.
  const result = useQuery({ queryKey: ['desk', 'end', sid], queryFn: () => deskClient.end(sid) });
  const household = useQuery({ queryKey: ['desk', 'household'], queryFn: deskClient.getHousehold });
  // The summary is kept in the screen's language and English; when the screen is English, in the
  // market's other language (Mandarin for a Singapore family, Hindi in India).
  const other: Locale = locale !== 'en' ? 'en' : household.data?.country === 'SG' ? 'zh' : 'hi';
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
    <CountryProvider country={household.data?.country}>
      <DeskHeader title={t('title')} subtitle={result.data?.session.hospitalName} />
      {/* Laptop: the advice and the actions on the left, the answer cards beside them; a phone
          reads them in one column, the cards straight after the advice. */}
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pb-12 pt-5 lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-5 lg:px-6 lg:pt-8">
        {result.isPending ? (
          <div className="flex flex-col gap-4 lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl">
            <Skeleton className="h-44" />
            <Skeleton className="h-64" />
            <span className="sr-only">{tc('loading')}</span>
          </div>
        ) : result.isError ? (
          <Card
            as="section"
            role="alert"
            className="flex flex-col items-start gap-3 lg:col-span-2 lg:mx-auto lg:w-full lg:max-w-2xl"
          >
            <p className="flex items-start gap-2 text-lg">
              <FileWarning aria-hidden className="mt-1 size-6 shrink-0 text-partial" />
              {t('loadFailed')}
            </p>
            <Button
              variant="secondary"
              loading={result.isFetching}
              onClick={() => result.refetch()}
            >
              <RotateCw aria-hidden className="size-5" />
              {t('retry')}
            </Button>
          </Card>
        ) : (
          <>
            <Card
              as="section"
              aria-labelledby="summary-title"
              className="flex flex-col gap-3 lg:col-start-1 lg:row-start-1"
            >
              <h2
                id="summary-title"
                className="flex items-start gap-2 font-display text-xl font-bold leading-snug"
              >
                <CircleCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-safe" />
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
              <section
                aria-label={t('cards')}
                className="flex flex-col gap-4 lg:col-start-2 lg:row-span-3 lg:row-start-1"
              >
                {answer.cards.map((card, i) => (
                  <AnswerCard key={card.id} card={card} index={i} />
                ))}
              </section>
            )}

            <Card as="section" className="flex items-start gap-3 lg:col-start-1 lg:row-start-2">
              <FileWarning aria-hidden className="mt-1 size-6 shrink-0 text-primary" />
              <p>
                {t('claimHint')}{' '}
                <Link href="/claims" className="font-semibold text-primary underline">
                  {t('claimLink')}
                </Link>
              </p>
            </Card>

            <div className="flex flex-col gap-3 lg:col-start-1 lg:row-start-3">
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
    </CountryProvider>
  );
}
