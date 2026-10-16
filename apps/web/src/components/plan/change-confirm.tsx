'use client';

import type { ChangeSet, GroupHealthOffer, Household, LifeChange } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Amount } from '@/components/kavach/amount';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { useDate } from './format';

const SUM_OPTIONS = [3_00_000, 5_00_000, 10_00_000];

/** S18: what Kavach understood, one question if a detail is missing, then "Looks right". */
export function ChangeConfirm({
  household,
  changeSet,
  saving,
  failed,
  onEdit,
  onConfirm,
}: {
  household: Household;
  changeSet: ChangeSet;
  saving: boolean;
  failed: boolean;
  onEdit: () => void;
  onConfirm: (changeSet: ChangeSet) => void;
}) {
  const t = useTranslations('plan.confirm');
  const date = useDate();
  const [changes, setChanges] = useState(changeSet.changes);
  const name = (id: string) => household.members.find((m) => m.id === id)?.name ?? id;
  const names = (ids: string[]) => ids.map(name).join(', ');

  const setOffer = (index: number, offer: GroupHealthOffer) =>
    setChanges((all) =>
      all.map((c, i) =>
        i === index && c.type === 'employment_started' ? { ...c, groupHealth: offer } : c,
      ),
    );
  const nuclear = household.members
    .filter((m) => ['self', 'spouse', 'child'].includes(m.relation))
    .map((m) => m.id);

  /** Who loses which employer cover on which day, from the household's policies. */
  const losses = (change: Extract<LifeChange, { type: 'employment_ended' }>) =>
    household.policies.filter(
      (p) =>
        p.source === 'employer' &&
        p.holderMemberId === change.memberId &&
        p.employer?.toLowerCase().includes(change.employer.toLowerCase().split(' ')[0]!),
    );

  const unanswered = changes.some(
    (c) => c.type === 'employment_started' && c.groupHealth.offered === 'unknown',
  );

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {changes.map((c, i) =>
          c.type === 'employment_ended' ? (
            <li key={i} className="flex flex-col gap-1">
              <span>
                {t('leaves', {
                  name: name(c.memberId),
                  employer: c.employer,
                  date: date(c.lastDay),
                })}
              </span>
              {losses(c).map((p) => (
                <span key={p.id} className="font-semibold text-gap">
                  {t('coverEnds', {
                    employer: p.employer ?? c.employer,
                    date: date(c.lastDay),
                    count: p.coveredMemberIds.length,
                  })}
                </span>
              ))}
            </li>
          ) : (
            <li key={i} className="flex flex-col gap-1">
              <span>
                {t('joins', {
                  name: name(c.memberId),
                  employer: c.employer,
                  date: date(c.startDate, true),
                })}
              </span>
              {c.groupHealth.offered === 'yes' && c.groupHealth.sumInsured && (
                <span>
                  {t.rich('newCover', {
                    employer: c.employer,
                    names: names(c.groupHealth.coveredMemberIds ?? [c.memberId]),
                    amount: () => <Amount value={c.groupHealth.sumInsured!} />,
                  })}
                </span>
              )}
              {c.groupHealth.offered === 'no' && (
                <span>{t('noCover', { employer: c.employer })}</span>
              )}
              {c.groupHealth.offered === 'unknown' && (
                <OfferQuestion
                  employer={c.employer}
                  onAnswer={(sum) =>
                    setOffer(
                      i,
                      sum
                        ? { offered: 'yes', sumInsured: sum, coveredMemberIds: nuclear }
                        : { offered: 'no' },
                    )
                  }
                />
              )}
            </li>
          ),
        )}
      </ul>
      {changeSet.unrecognised.length > 0 && (
        <p className="text-sm text-muted">
          {t('unrecognised', { text: changeSet.unrecognised.join('; ') })}
        </p>
      )}
      {changeSet.needsConfirmation && <p className="text-sm text-partial">{t('checkDates')}</p>}
      {failed && <p className="rounded-md bg-gap-bg p-3 text-gap">{t('saveError')}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onEdit}>
          {t('edit')}
        </Button>
        <Button
          loading={saving}
          disabled={unanswered}
          onClick={() => onConfirm({ ...changeSet, changes })}
        >
          {t('looksRight')}
        </Button>
      </div>
    </div>
  );
}

/** The one clarifying question: does the new employer give health cover, and how much? */
function OfferQuestion({
  employer,
  onAnswer,
}: {
  employer: string;
  onAnswer: (sum?: number) => void;
}) {
  const t = useTranslations('plan.confirm');
  const [yes, setYes] = useState(false);
  const chip = 'min-h-10 rounded-full border border-border px-3 text-sm hover:border-primary';
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-md bg-sunken p-3">
      <span className="font-semibold">{t('offerQuestion', { employer })}</span>
      <div className="flex flex-wrap gap-2">
        <button
          className={cn(chip, yes && 'border-primary text-primary')}
          onClick={() => setYes(true)}
        >
          {t('offerYes')}
        </button>
        <button className={chip} onClick={() => onAnswer(undefined)}>
          {t('offerNo')}
        </button>
      </div>
      {yes && (
        <div className="flex flex-wrap gap-2">
          {SUM_OPTIONS.map((sum) => (
            <button key={sum} className={chip} onClick={() => onAnswer(sum)}>
              <Amount value={sum} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
