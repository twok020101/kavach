'use client';

import type { AssessedDeduction, ClaimCase, Household } from '@kavach/schemas';
import { ArrowLeft, CircleCheck, CircleHelp, CircleX, FileText, Info, PenLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { apiMessage } from '@/lib/api';
import { useMoney } from '@/lib/country';
import { useState } from 'react';
import { ClauseChip } from '@/components/documents/ClauseSheet';
import { Amount } from '@/components/kavach/amount';
import { RuleId } from '@/components/kavach/verified-badge';
import { RuleList } from '@/components/plan/rule-list';
import { useDate } from '@/components/plan/format';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/components/ui/cn';
import { Disclosure } from '@/components/ui/disclosure';
import { Link, useRouter } from '@/i18n/navigation';
import { openLetter, useAssess, useClaim, useDraftAppeal } from './api';
import { ClaimFrame } from './claim-frame';

type Verdict = AssessedDeduction['verdict'];

/** Challengeable is money lost (gap), possibly is partial, valid needs nothing (na). */
const LOOK: Record<Verdict, { tone: BadgeTone; icon: typeof CircleX; border: string }> = {
  challengeable: { tone: 'gap', icon: CircleX, border: 'border-l-gap' },
  possibly: { tone: 'partial', icon: CircleHelp, border: 'border-l-partial' },
  valid: { tone: 'na', icon: CircleCheck, border: 'border-l-na' },
};
const ORDER: Verdict[] = ['challengeable', 'possibly', 'valid'];

/** S31 Deduction check. */
export function DeductionCheckScreen({ cid }: { cid: string }) {
  return <ClaimFrame>{(household) => <Check household={household} cid={cid} />}</ClaimFrame>;
}

function Check({ household, cid }: { household: Household; cid: string }) {
  const t = useTranslations('claim');
  const date = useDate();
  const router = useRouter();
  const { data: claim, error } = useClaim(household.id, cid);
  const draft = useDraftAppeal(household.id, cid);

  if (error) return <p className="rounded-md bg-gap-bg p-3 text-gap">{t('error')}</p>;
  if (!claim) return <p className="text-muted">{t('loading')}</p>;
  const { letter, assessment } = claim;
  if (!letter || !assessment) {
    return (
      <p className="rounded-md bg-gap-bg p-3 text-gap">
        {t('list.failed', { reason: claim.error ?? '' })}
      </p>
    );
  }
  const deductions = [...assessment.deductions].sort(
    (a, b) => ORDER.indexOf(a.verdict) - ORDER.indexOf(b.verdict),
  );
  const ruleIds = assessment.trace.map((f) => f.ruleId);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/claims" className="flex items-center gap-1 text-sm font-medium text-primary">
        <ArrowLeft aria-hidden className="size-4" /> {t('back')}
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">
          {letter.patientName}
          {letter.diagnosis && ` · ${letter.diagnosis}`}
        </h1>
        <p className="text-sm text-muted">
          {letter.hospitalName}
          {letter.admissionDate && ` · ${date(letter.admissionDate, true)}`}
        </p>
        <p className="text-sm text-muted">
          {letter.insurer} · {t('list.claimNo', { number: letter.claimNumber })}
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-sm text-muted">{t('check.billed')}</dt>
            <dd className="text-xl font-semibold">
              <Amount value={letter.billAmount} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{t('check.paid')}</dt>
            <dd className="text-xl font-semibold">
              <Amount value={letter.approvedAmount} />
            </dd>
          </div>
        </dl>
        {assessment.recoverable > 0 ? (
          <div className="rounded-md bg-gap-bg p-3 text-gap">
            <p className="font-display text-xl font-bold">
              {t.rich('check.recoverable', {
                amount: () => <Amount value={assessment.recoverable} />,
              })}
            </p>
            <p className="mt-1 text-sm text-text">
              {t.rich('check.payout', {
                amount: () => (
                  <Amount value={assessment.expectedPayout} className="font-semibold" />
                ),
              })}
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-safe-bg p-3 text-safe">{t('check.nothing')}</p>
        )}
        <BillFacts household={household} claim={claim} />
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="deductions">
        <h2 id="deductions" className="font-display text-lg font-semibold">
          {t('check.deductions')}
        </h2>
        <ul className="flex flex-col gap-3">
          {deductions.map((d) => (
            <DeductionRow key={d.label} deduction={d} householdId={household.id} />
          ))}
          <CopayRow claim={claim} />
        </ul>
      </section>

      <Disclosure label={t('check.why')} icon={<Info aria-hidden className="size-5" />}>
        <RuleList ids={ruleIds} />
      </Disclosure>

      {assessment.recoverable > 0 &&
        (claim.appeal ? (
          <Link
            href={`/claims/${claim.id}/appeal`}
            className={buttonClasses({ size: 'lg', className: 'w-full' })}
          >
            <PenLine aria-hidden className="size-5" />
            {t('check.review')}
          </Link>
        ) : (
          <Button
            size="lg"
            className="w-full"
            loading={draft.isPending}
            onClick={() =>
              draft.mutate(undefined, {
                onSuccess: () => router.push(`/claims/${claim.id}/appeal`),
              })
            }
          >
            <PenLine aria-hidden className="size-5" />
            {t('check.draft')}
          </Button>
        ))}
      {draft.isError && (
        <p className="rounded-md bg-gap-bg p-3 text-gap">{apiMessage(draft.error) ?? t('error')}</p>
      )}

      <Button variant="ghost" onClick={() => openLetter(household.id, claim.id)}>
        <FileText aria-hidden className="size-5" />
        {t('check.seeLetter')}
      </Button>
      <p className="text-sm text-muted">{t('check.notAdvice')}</p>
    </div>
  );
}

function DeductionRow({
  deduction: d,
  householdId,
}: {
  deduction: AssessedDeduction;
  householdId: string;
}) {
  const t = useTranslations('claim.check');
  const money = useMoney();
  const look = LOOK[d.verdict];
  return (
    <li className={cn('rounded-md border border-l-4 border-border bg-surface p-4', look.border)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{d.label}</p>
        <Amount value={d.amount} className="font-semibold" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={look.tone} icon={look.icon}>
          {t(`verdict.${d.verdict}`)}
        </Badge>
        {d.recoverable > 0 && (
          <span className="amount text-sm font-medium">
            {t('back', { amount: money(d.recoverable) })}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm">{d.reason}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {d.citation && <ClauseChip citation={d.citation} householdId={householdId} />}
        {d.ruleId && <RuleId id={d.ruleId} />}
      </div>
    </li>
  );
}

/** R-CLM-005: the co-pay the letter applied, checked against the policy rate. */
function CopayRow({ claim }: { claim: ClaimCase }) {
  const t = useTranslations('claim.check');
  const money = useMoney();
  const firing = claim.assessment?.trace.find((f) => f.ruleId === 'R-CLM-005');
  if (!firing || !claim.letter?.copayApplied) return null;
  const percent = Number(firing.inputs.copayPercent ?? 0);
  const expected = Number(firing.output.expectedCopay ?? 0);
  const valid = claim.letter.copayApplied <= expected;
  return (
    <li
      className={cn(
        'rounded-md border border-l-4 border-border bg-surface p-4',
        LOOK[valid ? 'valid' : 'challengeable'].border,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{t('copay', { percent })}</p>
        <Amount value={claim.letter.copayApplied} className="font-semibold" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone={valid ? 'na' : 'gap'} icon={valid ? CircleCheck : CircleX}>
          {t(`verdict.${valid ? 'valid' : 'challengeable'}`)}
        </Badge>
        <RuleId id="R-CLM-005" />
      </div>
      <p className="mt-2 text-sm">
        {valid ? t('copayValid', { percent }) : t('copayWrong', { expected: money(expected) })}
      </p>
    </li>
  );
}

/** What the engine read from the letter about the stay, which the family can correct. */
function BillFacts({ household, claim }: { household: Household; claim: ClaimCase }) {
  const t = useTranslations('claim.check');
  const money = useMoney();
  const assess = useAssess(household.id, claim.id);
  const [editing, setEditing] = useState(false);
  const [rent, setRent] = useState(String(claim.bill?.roomRentPerDay ?? ''));
  const [icu, setIcu] = useState(claim.bill?.icuStay ?? false);
  const bill = claim.bill;
  if (!bill) return null;

  if (!editing) {
    return (
      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span>{t('fromLetter')}:</span>
        <span className="amount">
          {bill.roomRentPerDay ? t('room', { amount: money(bill.roomRentPerDay) }) : t('noRoom')}
        </span>
        <span>· {bill.icuStay ? t('icu') : t('noIcu')}</span>
        <button className="font-medium text-primary underline" onClick={() => setEditing(true)}>
          {t('change')}
        </button>
      </p>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-md bg-sunken p-3"
      onSubmit={(e) => {
        e.preventDefault();
        assess.mutate(
          { roomRentPerDay: rent ? Number(rent) : undefined, icuStay: icu },
          { onSuccess: () => setEditing(false) },
        );
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t('roomRent')}
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={rent}
          onChange={(e) => setRent(e.target.value)}
          className="min-h-12 rounded-md border border-border-strong bg-surface px-3 text-base"
        />
      </label>
      <label className="flex min-h-12 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={icu}
          onChange={(e) => setIcu(e.target.checked)}
          className="size-5"
        />
        {t('icuLabel')}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setEditing(false)}>
          {t('cancel')}
        </Button>
        <Button type="submit" loading={assess.isPending}>
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
