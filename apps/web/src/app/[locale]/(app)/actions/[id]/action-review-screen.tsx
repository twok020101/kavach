'use client';

import type { Action, Household } from '@kavach/schemas';
import { BellRing, Check, Copy, FileDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ListSkeleton, pageTitle, QueryError } from '@/components/app/page-parts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Disclosure } from '@/components/ui/disclosure';
import { useDate } from '@/components/plan/format';
import { PlanFrame } from '@/components/plan/plan-frame';
import { openPdf, useAction, useDecideAction } from '@/components/plan/queries';
import { RuleList } from '@/components/plan/rule-list';

export function ActionReviewScreen({ id }: { id: string }) {
  return <PlanFrame>{(household) => <Review household={household} id={id} />}</PlanFrame>;
}

function Review({ household, id }: { household: Household; id: string }) {
  const t = useTranslations('plan.review');
  const tr = useTranslations('plan.replan');
  const date = useDate();
  const tp = useTranslations('plan');
  const { data: action, error, refetch } = useAction(household.id, id);
  const decide = useDecideAction(household.id);
  const [copied, setCopied] = useState(false);
  const [pdfFailed, setPdfFailed] = useState(false);

  if (error && !action) {
    return (
      <QueryError message={t('notFound')} retryLabel={tp('retry')} onRetry={() => refetch()} />
    );
  }
  if (!action) return <ListSkeleton rows={3} rowClassName="h-32" label={tp('loading')} />;
  const isLetter = action.kind !== 'reminder';
  const draft = action.status === 'draft';

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className={pageTitle}>{action.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {action.dueDate && (
            <Badge tone="partial">{t('due', { date: date(action.dueDate, true) })}</Badge>
          )}
          <Badge tone={draft ? 'neutral' : action.status === 'approved' ? 'safe' : 'na'}>
            {tr(`status.${action.status}`)}
          </Badge>
        </div>
        {action.recipient && <p className="text-muted">{t('to', { to: action.recipient })}</p>}
      </header>

      {isLetter ? (
        <>
          <Card className="font-serif text-[15px] leading-relaxed">
            <Letter content={action.content} />
          </Card>
          <p className="text-sm text-muted">{t('blanks')}</p>
        </>
      ) : (
        <WhatsAppPreview action={action} />
      )}

      <Disclosure label={t('why')}>
        <p className="mb-2 text-sm">{t(isLetter ? 'whyLetter' : 'whyReminder')}</p>
        <RuleList ids={['R-MG-001']} />
      </Disclosure>

      {draft && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            onClick={() => decide.mutate({ id: action.id, verb: 'dismiss' })}
            disabled={decide.isPending}
          >
            {t('dismiss')}
          </Button>
          <Button
            loading={decide.isPending}
            onClick={() => decide.mutate({ id: action.id, verb: 'approve' })}
          >
            <Check aria-hidden className="size-5" />
            {t(isLetter ? 'approve' : 'approveReminder')}
          </Button>
        </div>
      )}
      {decide.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{t('error')}</p>}

      {action.status === 'approved' && (
        <Card className="flex flex-col gap-2 border-safe bg-safe-bg">
          <p className="font-semibold text-safe">
            {t(isLetter ? 'approvedLetter' : 'approvedReminder')}
          </p>
          {isLetter && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() =>
                  navigator.clipboard.writeText(action.content).then(() => setCopied(true))
                }
              >
                <Copy aria-hidden className="size-5" />
                {copied ? t('copied') : t('copy')}
              </Button>
              {action.pdfPath && (
                <Button
                  onClick={() => openPdf(household.id, action.id).catch(() => setPdfFailed(true))}
                >
                  <FileDown aria-hidden className="size-5" />
                  {t('pdf')}
                </Button>
              )}
            </div>
          )}
          {pdfFailed && <p className="text-sm text-gap">{t('error')}</p>}
          <p className="text-sm text-muted">{t('neverSends')}</p>
        </Card>
      )}
    </div>
  );
}

/** The letter text, with the "[____]" blanks the family must fill highlighted. */
function Letter({ content }: { content: string }) {
  const t = useTranslations('plan.review');
  const [subject = '', ...rest] = content.split('\n');
  const blank = (text: string) =>
    text.split(/(\[____\])/).map((part, i) =>
      part === '[____]' ? (
        <mark key={i} className="rounded-sm bg-partial-bg px-2 text-partial">
          {t('fill')}
        </mark>
      ) : (
        part
      ),
    );
  return (
    <div className="flex flex-col gap-3 whitespace-pre-wrap">
      <p className="font-sans font-semibold">{subject}</p>
      <div>{blank(rest.join('\n').trim())}</div>
    </div>
  );
}

/** The dated nudge as it will arrive on WhatsApp. */
function WhatsAppPreview({ action }: { action: Action }) {
  const t = useTranslations('plan.review');
  return (
    <div className="flex flex-col gap-2 rounded-md bg-safe-bg p-4">
      <span className="flex items-center gap-1 text-xs font-semibold text-safe">
        <BellRing aria-hidden className="size-4" /> {t('whatsapp')}
      </span>
      <p className="max-w-[85%] self-start rounded-md rounded-tl-none bg-surface p-3 shadow-sm">
        {action.content}
      </p>
    </div>
  );
}
