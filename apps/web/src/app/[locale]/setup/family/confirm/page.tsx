'use client';

import type { Household, IntakeResult, Member } from '@kavach/schemas';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/kavach/icon';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { MemberSheet } from '@/components/setup/member-sheet';
import { SetupFrame, SetupLoadState } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { useRouter } from '@/i18n/navigation';
import { signedInName } from '@/lib/firebase';
import { clearIntake, type DraftMember, loadIntake, useSetMembers } from '@/lib/setup';

type Draft = DraftMember & { assumed: string[] };

/** A text field in the Stitch style, with a visible focus ring. */
const FIELD =
  'min-h-12 rounded-lg border border-outline-variant bg-surface px-3 text-body-lg text-on-surface focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const GENERATIONS: Member['relation'][][] = [
  ['parent', 'parent_in_law'],
  ['self', 'spouse'],
  ['child'],
  ['other'],
];

/** The intake agent's people, or the family as already saved. */
function initialDrafts(intake: IntakeResult | undefined, household: Household): Draft[] {
  if (intake) {
    return intake.members.map((m) => ({
      name: m.relation === 'self' && !m.named ? '' : m.name,
      relation: m.relation,
      age: m.age,
      earning: m.earning ?? undefined,
      conditions: m.conditions,
      language: m.language ?? 'en',
      assumed: m.assumed,
    }));
  }
  return household.members.map((m) => ({ ...m, assumed: [] }));
}

/** S05 Family card: check the people the agent found, fill in ages, then save. */
export default function FamilyConfirmPage() {
  const t = useTranslations('setup.confirm');
  const { data: household, error, refetch, isFetching } = useSetupHousehold();
  if (!household)
    return (
      <SetupFrame step={1} back="/setup/family" title={t('title')}>
        <SetupLoadState error={error} retrying={isFetching} onRetry={() => refetch()} />
      </SetupFrame>
    );
  return <FamilyConfirm household={household} />;
}

function FamilyConfirm({ household }: { household: Household }) {
  const t = useTranslations('setup.confirm');
  const tc = useTranslations('common');
  const ts = useTranslations('setup');
  const router = useRouter();
  const save = useSetMembers(household.id);
  const [intake] = useState(loadIntake);
  const [drafts, setDrafts] = useState(() => initialDrafts(intake, household));
  const [familyName, setFamilyName] = useState(
    intake?.familyName
      ? `${intake.familyName} family`
      : household.members.length
        ? household.name
        : '',
  );
  const [city, setCity] = useState(intake?.city ?? household.city);
  const [editing, setEditing] = useState<number | 'new'>();

  const empty = drafts.length === 0;
  useEffect(() => {
    if (empty) router.replace('/setup/family');
  }, [empty, router]);
  // Sign-in may know the person's own name.
  useEffect(() => {
    signedInName().then(
      (name) =>
        name &&
        setDrafts((list) =>
          list.map((d) => (d.relation === 'self' && !d.name ? { ...d, name } : d)),
        ),
    );
  }, []);

  const health = household.consents?.some((c) => c.purpose === 'health' && !c.withdrawnAt) ?? false;
  const missing = drafts.filter((d) => d.age === null || !d.name).length;
  const assumed = drafts.filter((d) => d.assumed.includes('earning') && d.relation !== 'child');
  const displayName = (d: Draft) => d.name || t(`defaultNames.${d.relation}`);

  const onSave = (member: DraftMember) => {
    setDrafts((list) =>
      editing === 'new'
        ? [...list, { ...member, assumed: [] }]
        : list.map((d, i) => (i === editing ? { ...member, assumed: [] } : d)),
    );
    setEditing(undefined);
  };

  const confirm = () =>
    save.mutate(
      {
        name: familyName.trim() || t('familyNamePlaceholder'),
        city: city.trim() || undefined,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        members: drafts.map(({ assumed, age, ...m }) => ({ ...m, age: age ?? 0 })),
      },
      {
        onSuccess: () => {
          clearIntake();
          router.push('/setup/money');
        },
      },
    );

  const person = (d: Draft, i: number) => (
    <li key={i}>
      <button
        type="button"
        onClick={() => setEditing(i)}
        className="press flex w-36 flex-col items-center gap-1 rounded-lg p-2 text-center hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <MemberAvatar member={{ ...d, id: String(i), name: displayName(d), age: d.age ?? 0 }} />
        <span className="font-display text-title-md text-on-surface [overflow-wrap:anywhere]">
          {displayName(d)}
          {d.age !== null && (
            <span className="font-sans font-normal text-on-surface-variant"> {d.age}</span>
          )}
        </span>
        <span className="text-body-sm text-on-surface-variant">
          {d.relation === 'self' ? t('you') : tc(`relation.${d.relation}`).toLowerCase()}
          {d.conditions.length > 0 &&
            ` · ${d.conditions
              .map((c) => t(`conditionNames.${c}`))
              .join(', ')
              .toLowerCase()}`}
        </span>
        {(d.age === null || !d.name) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-partial-bg px-2 py-0.5 text-body-sm font-medium text-partial">
            <Icon name="edit" className="text-sm" />
            {d.name ? t('addAge') : t('edit.name')}
          </span>
        )}
      </button>
    </li>
  );

  return (
    <SetupFrame
      step={1}
      back="/setup/family"
      title={t('title')}
      intro={
        <>
          {t('intro')}
          {intake?.transcript && (
            <span className="mt-2 block text-body-md text-on-surface-variant">
              {t('heard', { text: intake.transcript })}
            </span>
          )}
        </>
      }
      footer={
        <Button size="lg" disabled={missing > 0} loading={save.isPending} onClick={confirm}>
          {missing > 0 ? t('needAges', { count: missing }) : t('looksRight')}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-body-md font-medium text-on-surface">{t('familyName')}</span>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder={t('familyNamePlaceholder')}
            className={FIELD}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-body-md font-medium text-on-surface">{t('city')}</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={FIELD} />
        </label>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-lg bg-surface p-3 shadow-1 ring-1 ring-border/60 sm:p-4">
        {GENERATIONS.map((relations, row) => {
          const people = drafts
            .map((d, i) => [d, i] as const)
            .filter(([d]) => relations.includes(d.relation));
          if (!people.length) return null;
          return (
            <ul
              key={row}
              className={cn(
                'flex flex-wrap justify-center gap-1',
                row > 0 && 'border-t border-dashed border-border pt-2',
              )}
            >
              {people.map(([d, i]) => person(d, i))}
            </ul>
          );
        })}
      </div>

      {assumed.length > 0 && (
        <ul className="flex flex-col rounded-lg bg-surface-container-low px-4 py-2 text-body-md">
          {assumed.map((d) => {
            const i = drafts.indexOf(d);
            return (
              <li key={i} className="flex flex-wrap items-center gap-x-1.5">
                <span className="text-on-surface-variant">{t('assumed')}</span>
                <span className="text-on-surface">
                  {d.relation === 'self' && d.earning
                    ? t('assumedSelf')
                    : t('assumedEarning', { name: displayName(d), earning: String(d.earning) })}
                </span>
                <button
                  type="button"
                  className="inline-flex min-h-12 items-center px-1 font-medium text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => setEditing(i)}
                >
                  {t('change')}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button variant="ghost" className="self-start" onClick={() => setEditing('new')}>
        <Plus aria-hidden className="size-5" />
        {t('add')}
      </Button>

      {save.isError && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-gap-bg p-4 text-gap">
          <Icon name="error" className="mt-0.5 text-lg" />
          {ts('error')}
        </p>
      )}

      <MemberSheet
        member={
          editing === 'new'
            ? { name: '', relation: 'other', age: null, conditions: [], language: 'en' }
            : editing !== undefined
              ? drafts[editing]
              : undefined
        }
        isNew={editing === 'new'}
        health={health}
        onSave={onSave}
        onRemove={() => {
          setDrafts((list) => list.filter((_, i) => i !== editing));
          setEditing(undefined);
        }}
        onClose={() => setEditing(undefined)}
      />
    </SetupFrame>
  );
}
