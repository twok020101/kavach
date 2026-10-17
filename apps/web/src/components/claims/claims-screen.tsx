'use client';

import type { ClaimCase, Household } from '@kavach/schemas';
import { Camera, ChevronRight, FileUp, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { AgentSteps, type AgentStep } from '@/components/kavach/agent-steps';
import { Amount } from '@/components/kavach/amount';
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">{t('list.title')}</h1>
        <p className="text-muted">{t('list.intro')}</p>
      </header>

      {create.isPending ? (
        <ReadingSteps />
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border-strong bg-surface p-6 text-center">
          <FileUp aria-hidden className="size-8 text-muted" />
          <p className="font-medium">{t('list.drop')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => fileInput.current?.click()}>{t('list.choose')}</Button>
            <Button variant="secondary" onClick={() => cameraInput.current?.click()}>
              <Camera aria-hidden className="size-5" />
              {t('list.photo')}
            </Button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="ghost" onClick={() => start()}>
              <Sparkles aria-hidden className="size-5" />
              {t('list.sample')}
            </Button>
            {household.isDemo && (
              <Button variant="ghost" onClick={() => start('maternity')}>
                <Sparkles aria-hidden className="size-5" />
                {t('list.sampleMaternity')}
              </Button>
            )}
          </div>
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
        <p className="rounded-md bg-gap-bg p-3 text-gap">
          {failed ? t('list.failed', { reason: failed.error ?? '' }) : t('error')}
        </p>
      )}

      {claims.data && claims.data.length === 0 && !create.isPending && (
        <p className="text-muted">{t('list.empty')}</p>
      )}
      <ul className="flex flex-col gap-3">
        {claims.data?.map((claim) => (
          <ClaimRow key={claim.id} claim={claim} />
        ))}
      </ul>
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
        className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4 hover:border-primary"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold">
              {letter ? `${letter.patientName} · ${letter.hospitalName}` : claim.id}
            </p>
            {letter && (
              <p className="text-sm text-muted">
                {letter.insurer} · {t('claimNo', { number: letter.claimNumber })}
              </p>
            )}
          </div>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-muted" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[claim.status]} className="text-xs">
            {t(`status.${claim.status}`)}
          </Badge>
          {assessment &&
            (assessment.recoverable > 0 ? (
              <span className="text-sm font-semibold text-gap">
                {t.rich('recoverable', {
                  amount: () => <Amount value={assessment.recoverable} />,
                })}
              </span>
            ) : (
              <span className="text-sm text-muted">{t('nothing')}</span>
            ))}
        </div>
      </Link>
    </li>
  );
}
