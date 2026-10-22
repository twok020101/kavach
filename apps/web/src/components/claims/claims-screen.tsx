'use client';

import type { ClaimCase, Household } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { EmptyState, ListSkeleton, PageHeader, QueryError } from '@/components/app/page-parts';
import { AgentSteps, type AgentStep } from '@/components/kavach/agent-steps';
import { Amount } from '@/components/kavach/amount';
import { Icon } from '@/components/kavach/icon';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import { useClaims, useCreateClaim } from './api';
import { ClaimFrame } from './claim-frame';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp,image/heic';
const STEPS = ['read', 'match', 'check', 'cite'] as const;

const STATUS_TONE: Record<ClaimCase['status'], BadgeTone> = {
  reading: 'neutral',
  assessed: 'primary',
  appeal_drafted: 'partial',
  appeal_sent: 'partial',
  resolved: 'safe',
  failed: 'gap',
};

/** S30 Claims: upload or pick the sample settlement letter; list of letters already checked. */
export function ClaimsScreen() {
  return <ClaimFrame>{(household) => <Claims household={household} />}</ClaimFrame>;
}

function Claims({ household }: { household: Household }) {
  const t = useTranslations('claim');
  const router = useRouter();
  const claims = useClaims(household.id);
  const create = useCreateClaim(household.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const start = (file?: File | 'maternity') =>
    create.mutate(file, {
      onSuccess: (claim) => claim.status !== 'failed' && router.push(`/claims/${claim.id}`),
    });
  const onFiles = (files: FileList | null) => files?.[0] && start(files[0]);
  const failed = create.data?.status === 'failed' ? create.data : undefined;
  // The sample letters belong to the Sharma story: the API moves a demo family to that story
  // before reading one, so a Singapore family is not offered them.
  const sg = household.country === 'SG';

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title={t('list.title')} intro={sg ? t('list.introSg') : t('list.intro')} />

      {create.isPending ? (
        <ReadingSteps />
      ) : (
        <section className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-outline-variant bg-surface px-5 py-8 text-center sm:py-10">
          <span className="flex size-12 items-center justify-center rounded-md bg-surface-container-high text-primary">
            <Icon name="upload_file" className="text-2xl" />
          </span>
          <p className="font-display text-title-md text-on-surface">{t('list.drop')}</p>
          <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row">
            <Button onClick={() => fileInput.current?.click()}>
              <Icon name="attach_file" className="text-xl" />
              {t('list.choose')}
            </Button>
            <Button variant="secondary" onClick={() => cameraInput.current?.click()}>
              <Icon name="photo_camera" className="text-xl" />
              {t('list.photo')}
            </Button>
          </div>
          {sg ? (
            <p className="flex items-center gap-1.5 font-serif text-citation-sm text-on-surface-variant">
              <Icon name="info" className="text-sm" />
              {t('list.sampleSgNote')}
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-x-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => start()}>
                <Icon name="auto_awesome" className="text-lg" />
                {t('list.sample')}
              </Button>
              {household.isDemo && (
                <Button variant="ghost" size="sm" onClick={() => start('maternity')}>
                  <Icon name="auto_awesome" className="text-lg" />
                  {t('list.sampleMaternity')}
                </Button>
              )}
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </section>
      )}

      {(create.isError || failed) && (
        <p role="alert" className="rounded-md bg-gap-bg p-3 text-body-md text-gap">
          {failed ? t('list.failed', { reason: failed.error ?? '' }) : t('error')}
        </p>
      )}

      <section aria-labelledby="checked" className="flex flex-col gap-3">
        <h2 id="checked" className="px-1 font-display text-headline-sm text-on-surface">
          {t('list.checked')}
        </h2>
        {claims.isError && !claims.data ? (
          <QueryError
            message={t('error')}
            retryLabel={t('retry')}
            onRetry={() => claims.refetch()}
          />
        ) : !claims.data ? (
          <ListSkeleton rows={2} label={t('loading')} />
        ) : claims.data.length === 0 ? (
          <EmptyState icon="receipt_long" title={t('list.empty')} body={t('list.emptyBody')} />
        ) : (
          <ul className="flex flex-col gap-3">
            {claims.data.map((claim) => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** The reader is one request; pace the steps so the family sees what is happening. */
function ReadingSteps() {
  const t = useTranslations('claim.steps');
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((i) => Math.min(i + 1, STEPS.length - 1)), 900);
    return () => clearInterval(timer);
  }, []);
  const steps: AgentStep[] = STEPS.map((key, i) => ({
    label: t(key),
    state: i < active ? 'done' : i === active ? 'active' : 'pending',
  }));
  return <AgentSteps steps={steps} className="rounded-lg border border-border bg-surface p-4" />;
}

function ClaimRow({ claim }: { claim: ClaimCase }) {
  const t = useTranslations('claim.list');
  const { letter, assessment } = claim;
  return (
    <li>
      <Link
        href={`/claims/${claim.id}`}
        className="group lift press flex items-start gap-4 rounded-lg border border-border bg-surface p-4 shadow-1 hover:border-primary/50 sm:p-5"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-primary">
          <Icon name="receipt_long" className="text-[22px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-title-md text-on-surface">
              {letter ? `${letter.patientName} · ${letter.hospitalName}` : claim.id}
            </span>
            {letter && (
              <span className="text-body-sm text-on-surface-variant">
                {letter.insurer} · {t('claimNo', { number: letter.claimNumber })}
              </span>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[claim.status]} className="text-xs">
              {t(`status.${claim.status}`)}
            </Badge>
            {assessment &&
              (assessment.recoverable > 0 ? (
                <span className="text-body-sm font-semibold text-gap">
                  {t.rich('recoverable', {
                    amount: () => <Amount value={assessment.recoverable} />,
                  })}
                </span>
              ) : (
                <span className="text-body-sm text-on-surface-variant">{t('nothing')}</span>
              ))}
          </span>
        </span>
        <Icon
          name="chevron_right"
          className="nudge mt-2 shrink-0 text-2xl text-outline group-hover:text-primary"
        />
      </Link>
    </li>
  );
}
