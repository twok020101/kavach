'use client';

import type { AppealCheck, ClaimCase, Household } from '@kavach/schemas';
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  Copy,
  FileDown,
  Mail,
  PenLine,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ListSkeleton, pageTitle, QueryError } from '@/components/app/page-parts';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/cn';
import { Disclosure } from '@/components/ui/disclosure';
import { Link } from '@/i18n/navigation';
import { downloadAppealPdf, useClaim, useUpdateAppeal } from './api';
import { ClaimFrame } from './claim-frame';

/** S32 Appeal review. */
export function AppealReviewScreen({ cid }: { cid: string }) {
  return <ClaimFrame>{(household) => <Review household={household} cid={cid} />}</ClaimFrame>;
}

function Review({ household, cid }: { household: Household; cid: string }) {
  const t = useTranslations('claim');
  const { data: claim, error, refetch } = useClaim(household.id, cid);

  if (error && !claim) {
    return <QueryError message={t('error')} retryLabel={t('retry')} onRetry={() => refetch()} />;
  }
  if (!claim) return <ListSkeleton rows={3} rowClassName="h-28" label={t('loading')} />;

  return (
    <div className="flex flex-col gap-5">
      <Link
        href={`/claims/${cid}`}
        className="flex items-center gap-1 text-sm font-medium text-primary"
      >
        <ArrowLeft aria-hidden className="size-4" /> {claim.letter?.patientName ?? t('back')}
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className={pageTitle}>{t('appeal.title')}</h1>
        {claim.letter && (
          <p className="text-muted">{t('appeal.to', { insurer: claim.letter.insurer })}</p>
        )}
      </header>
      {claim.appeal ? (
        <Appeal household={household} claim={claim} />
      ) : (
        <p className="text-muted">{t('appeal.notFound')}</p>
      )}
    </div>
  );
}

function Appeal({ household, claim }: { household: Household; claim: ClaimCase }) {
  const t = useTranslations('claim.appeal');
  const appeal = claim.appeal!;
  const update = useUpdateAppeal(household.id, claim.id);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(appeal.text);
  const [copied, setCopied] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const ok = appeal.verification.ok;

  const mailto = `mailto:${claim.letter?.grievanceEmail ?? ''}?subject=${encodeURIComponent(
    appeal.draft.subject,
  )}&body=${encodeURIComponent(appeal.text)}`;

  return (
    <>
      <Verification checks={appeal.verification.checks} ok={ok} />

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {appeal.edited ? <Badge className="text-xs">{t('edited')}</Badge> : <span />}
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <PenLine aria-hidden className="size-4" />
              {t('edit')}
            </Button>
          )}
        </div>
        {editing ? (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={24}
              aria-label={t('title')}
              className="w-full rounded-md border border-border-strong bg-surface p-3 font-serif text-[15px] leading-relaxed"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setText(appeal.text);
                  setEditing(false);
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                loading={update.isPending}
                onClick={() =>
                  update.mutate(text, {
                    onSuccess: () => {
                      setEditing(false);
                      // The check result sits at the top; show it.
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    },
                  })
                }
              >
                {t('save')}
              </Button>
            </div>
          </>
        ) : (
          <div className="whitespace-pre-wrap break-words font-serif text-[15px] leading-relaxed">
            {appeal.text}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          disabled={!ok || editing}
          onClick={() => {
            setPdfError(false);
            downloadAppealPdf(household.id, claim).catch(() => setPdfError(true));
          }}
        >
          <FileDown aria-hidden className="size-5" />
          {t('pdf')}
        </Button>
        {!ok && <p className="text-sm text-gap">{t('blocked')}</p>}
        {pdfError && <p className="text-sm text-gap">{t('blocked')}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={!ok}
            onClick={() => navigator.clipboard.writeText(appeal.text).then(() => setCopied(true))}
          >
            <Copy aria-hidden className="size-5" />
            {copied ? t('copied') : t('copy')}
          </Button>
          <a
            href={ok ? mailto : undefined}
            aria-disabled={!ok}
            className={buttonClasses({
              variant: 'secondary',
              className: cn(!ok && 'pointer-events-none opacity-50'),
            })}
          >
            <Mail aria-hidden className="size-5" />
            {t('email')}
          </a>
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="ladder">
        <h2 id="ladder" className="font-display text-lg font-semibold">
          {t('next')}
        </h2>
        <ol className="flex flex-col gap-2">
          {(['one', 'two', 'three'] as const).map((step, i) => (
            <li key={step} className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  i === 0 ? 'bg-primary text-on-primary' : 'bg-sunken text-muted',
                )}
              >
                {i + 1}
              </span>
              <span className="pt-0.5">{t(`ladder.${step}`)}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="text-sm text-muted">{t('neverSends')}</p>
    </>
  );
}

/** The verifier's result: failed checks always shown; passed ones on demand. */
function Verification({ checks, ok }: { checks: AppealCheck[]; ok: boolean }) {
  const t = useTranslations('claim.appeal');
  const failed = checks.filter((c) => !c.ok);
  return (
    <Card
      className={cn('flex flex-col gap-2', ok ? 'border-safe bg-safe-bg' : 'border-gap bg-gap-bg')}
    >
      <p className={cn('flex items-start gap-2 font-semibold', ok ? 'text-safe' : 'text-gap')}>
        {ok ? (
          <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
        ) : (
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
        )}
        {ok ? t('verified') : t('failed')}
      </p>
      {failed.length > 0 && <CheckList checks={failed} />}
      <Disclosure label={t('checks', { count: checks.length })}>
        <CheckList checks={checks} />
      </Disclosure>
    </Card>
  );
}

function CheckList({ checks }: { checks: AppealCheck[] }) {
  const t = useTranslations('claim.appeal.kinds');
  return (
    <ul className="flex flex-col gap-2">
      {checks.map((c, i) => (
        <li key={`${c.kind}-${i}`} className="flex items-start gap-2 text-sm">
          {c.ok ? (
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-safe" />
          ) : (
            <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-gap" />
          )}
          <span className="min-w-0">
            <span className="font-medium">{t(c.kind)}:</span>{' '}
            <span className="amount break-words">{c.subject}</span>
            <span className="block text-muted">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
