'use client';

import { Locale, Relation } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Sheet } from '../plan/sheet';
import { Button } from '../ui/button';
import { cn } from '../ui/cn';
import type { DraftMember } from '@/lib/setup';

const CONDITIONS = ['diabetes_t2', 'hypertension', 'heart_disease', 'asthma'];

const inputClass = 'min-h-12 w-full rounded-md border border-border-strong bg-surface px-3 text-lg';

/** S05 edit sheet: name, relation, age, earning, conditions (with health consent) and language. */
export function MemberSheet({
  member,
  isNew,
  health,
  onSave,
  onRemove,
  onClose,
}: {
  member: DraftMember | undefined;
  isNew: boolean;
  health: boolean;
  onSave: (member: DraftMember) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('setup.confirm');
  return (
    <Sheet open={!!member} onClose={onClose} title={isNew ? t('edit.newTitle') : t('edit.title')}>
      {member && (
        <MemberForm
          key={member.id ?? 'new'}
          member={member}
          isNew={isNew}
          health={health}
          onSave={onSave}
          onRemove={onRemove}
        />
      )}
    </Sheet>
  );
}

function MemberForm({
  member,
  isNew,
  health,
  onSave,
  onRemove,
}: {
  member: DraftMember;
  isNew: boolean;
  health: boolean;
  onSave: (member: DraftMember) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('setup.confirm');
  const tc = useTranslations('common');
  const [draft, setDraft] = useState(member);
  const set = (patch: Partial<DraftMember>) => setDraft((d) => ({ ...d, ...patch }));
  const earning = draft.earning === undefined ? 'unknown' : draft.earning ? 'yes' : 'no';

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...draft, name: draft.name.trim() });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="font-medium">{t('edit.name')}</span>
        <input
          className={inputClass}
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          required
          autoFocus={isNew}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('edit.relation')}</span>
          <select
            className={inputClass}
            value={draft.relation}
            onChange={(e) => set({ relation: e.target.value as DraftMember['relation'] })}
          >
            {Relation.options.map((r) => (
              <option key={r} value={r}>
                {tc(`relation.${r}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">{t('edit.age')}</span>
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={0}
            max={110}
            required
            value={draft.age ?? ''}
            onChange={(e) => set({ age: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">{t('edit.earning')}</legend>
        <div className="flex gap-2">
          {(['yes', 'no', 'unknown'] as const).map((option) => (
            <Chip
              key={option}
              selected={earning === option}
              onClick={() => set({ earning: option === 'unknown' ? undefined : option === 'yes' })}
            >
              {t(`edit.earningOptions.${option}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      {health && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 font-medium">{t('edit.conditions')}</legend>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => {
              const on = draft.conditions.includes(c);
              return (
                <Chip
                  key={c}
                  selected={on}
                  onClick={() =>
                    set({
                      conditions: on
                        ? draft.conditions.filter((x) => x !== c)
                        : [...draft.conditions, c],
                    })
                  }
                >
                  {t(`conditionNames.${c}`)}
                </Chip>
              );
            })}
          </div>
          <p className="text-sm text-muted">{t('edit.conditionsHint')}</p>
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">{t('edit.language')}</legend>
        <div className="flex gap-2">
          {Locale.options.map((l) => (
            <Chip key={l} selected={draft.language === l} onClick={() => set({ language: l })}>
              {tc(`languages.${l}`)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <div className="sticky -bottom-8 -mx-4 -mb-8 mt-2 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3">
        {!isNew && draft.relation !== 'self' ? (
          <Button variant="ghost" onClick={onRemove} className="text-gap">
            {t('edit.remove')}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" size="lg">
          {t('edit.save')}
        </Button>
      </div>
    </form>
  );
}

/** A selectable pill (single or multi choice). */
export function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'press min-h-12 rounded-full border-2 px-4 font-medium',
        selected
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border-strong bg-surface text-text hover:border-primary',
        className,
      )}
    >
      {children}
    </button>
  );
}
