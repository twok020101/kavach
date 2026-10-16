'use client';

import type { Household, IntakeResult, Member } from '@kavach/schemas';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { MemberSheet } from '@/components/setup/member-sheet';
import { SetupFrame } from '@/components/setup/setup-frame';
import { useSetupHousehold } from '@/components/setup/use-setup-household';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { useRouter } from '@/i18n/navigation';
import { signedInName } from '@/lib/firebase';
import { clearIntake, type DraftMember, loadIntake, useSetMembers } from '@/lib/setup';

type Draft = DraftMember & { assumed: string[] };

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
  const { data: household } = useSetupHousehold();
  if (!household)
    return (
      <SetupFrame step={1} title={t('title')}>
        {null}
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
        onClick={() => setEditing(i)}
        className="flex w-36 flex-col items-center gap-1 rounded-md p-2 text-center hover:bg-sunken"
      >
        <MemberAvatar member={{ ...d, id: String(i), name: displayName(d), age: d.age ?? 0 }} />
        <span className="font-semibold">
          {displayName(d)}
          {d.age !== null && <span className="font-normal text-muted"> {d.age}</span>}
        </span>
        <span className="text-sm text-muted">
          {d.relation === 'self' ? t('you') : tc(`relation.${d.relation}`).toLowerCase()}
          {d.conditions.length > 0 &&
            ` · ${d.conditions
              .map((c) => t(`conditionNames.${c}`))
              .join(', ')
              .toLowerCase()}`}
        </span>
        {(d.age === null || !d.name) && (
          <span className="rounded-sm bg-partial-bg px-2 text-sm font-medium text-partial">
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
      intro={t('intro')}
      footer={
        <Button size="lg" disabled={missing > 0} loading={save.isPending} onClick={confirm}>
          {missing > 0 ? t('needAges', { count: missing }) : t('looksRight')}
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted">{t('familyName')}</span>
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder={t('familyNamePlaceholder')}
            className="min-h-12 rounded-md border border-border-strong bg-surface px-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted">{t('city')}</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="min-h-12 rounded-md border border-border-strong bg-surface px-3"
          />
        </label>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-3">
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
        <ul className="flex flex-col gap-1 text-sm">
          {assumed.map((d) => {
            const i = drafts.indexOf(d);
            return (
              <li key={i} className="flex flex-wrap gap-1">
                <span className="text-muted">{t('assumed')}</span>
                <span>
                  {t('assumedEarning', { name: displayName(d), earning: String(d.earning) })}
                </span>
                ·
                <button
                  className="font-medium text-primary underline"
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

      {save.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}

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
