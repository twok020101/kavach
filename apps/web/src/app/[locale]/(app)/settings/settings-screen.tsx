'use client';

import type { ConsentPurpose, Household } from '@kavach/schemas';
import { ChevronRight, Download, LogOut, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { PlanFrame } from '@/components/plan/plan-frame';
import { ConsentToggles } from '@/components/setup/consent-toggles';
import { Chip } from '@/components/setup/member-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useRouter } from '@/i18n/navigation';
import { signOutUser } from '@/lib/firebase';
import { rememberHouseholdId } from '@/lib/session';
import { downloadExport, useDeleteHousehold, useSetConsents } from '@/lib/setup';
import { type TextScale, type ThemePref, useAppearance } from '@/lib/theme';

export function SettingsScreen() {
  return <PlanFrame>{(household) => <Settings household={household} />}</PlanFrame>;
}

function Settings({ household }: { household: Household }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const { theme, setTheme, textScale, setTextScale } = useAppearance();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>

      <Section title={t('appearance.title')}>
        <Row label={t('appearance.language')}>
          <LanguageSwitch />
        </Row>
        <Row label={t('appearance.theme')}>
          <div className="flex flex-wrap gap-2">
            {(['system', 'light', 'dark'] as ThemePref[]).map((pref) => (
              <Chip key={pref} selected={theme === pref} onClick={() => setTheme(pref)}>
                {t(`appearance.themes.${pref}`)}
              </Chip>
            ))}
          </div>
        </Row>
        <Row label={t('appearance.textSize')}>
          <div className="flex gap-2">
            {(['normal', 'large'] as TextScale[]).map((scale) => (
              <Chip key={scale} selected={textScale === scale} onClick={() => setTextScale(scale)}>
                {t(`appearance.textSizes.${scale}`)}
              </Chip>
            ))}
          </div>
        </Row>
      </Section>

      <Section title={t('family.title')}>
        <NavRow href="/settings/access" label={t('family.access')} hint={t('family.accessHint')} />
        {!household.isDemo && (
          <NavRow
            href="/setup/family/confirm"
            label={t('family.edit')}
            hint={t('family.editHint')}
          />
        )}
        {household.isDemo && (
          <NavRow href="/demo" label={t('family.demo')} hint={t('family.demoHint')} />
        )}
      </Section>

      <Consents household={household} />

      <Section title={t('data.title')}>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">{t('data.downloadHint')}</p>
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => downloadExport(household.id)}
          >
            <Download aria-hidden className="size-5" />
            {t('data.download')}
          </Button>
        </div>
        <DeleteHousehold household={household} />
      </Section>

      <Section title={t('about.title')}>
        <p className="text-sm">{t('about.body')}</p>
        <Link href="/proof" className="font-medium text-primary underline">
          {t('about.proof')}
        </Link>
      </Section>

      <Button
        variant="ghost"
        className="self-start"
        onClick={async () => {
          await signOutUser();
          rememberHouseholdId(undefined);
          router.push('/');
        }}
      >
        <LogOut aria-hidden className="size-5" />
        {t('signOut')}
      </Button>
    </div>
  );
}

function Consents({ household }: { household: Household }) {
  const t = useTranslations('settings');
  const active = (household.consents ?? []).filter((c) => !c.withdrawnAt).map((c) => c.purpose);
  const [value, setValue] = useState<ConsentPurpose[]>(active);
  const save = useSetConsents(household.id);
  const changed = [...value].sort().join() !== [...active].sort().join();

  return (
    <Section title={t('consent.title')}>
      {household.isDemo ? (
        <p className="text-sm text-muted">{t('consent.demoNote')}</p>
      ) : (
        <>
          <ConsentToggles value={value} onChange={setValue} />
          <div className="flex items-center gap-3">
            <Button
              disabled={!changed || !value.includes('planning')}
              loading={save.isPending}
              onClick={() => save.mutate(value)}
            >
              {t('consent.save')}
            </Button>
            {save.isSuccess && !changed && <span className="text-safe">{t('consent.saved')}</span>}
          </div>
        </>
      )}
    </Section>
  );
}

function DeleteHousehold({ household }: { household: Household }) {
  const t = useTranslations('settings.data');
  const router = useRouter();
  const remove = useDeleteHousehold(household.id);
  const [typed, setTyped] = useState('');
  const phrase = t('deletePhrase');
  return (
    <div className="flex flex-col gap-2 rounded-md border border-gap/40 bg-gap-bg/40 p-4">
      <p className="font-semibold text-gap">{t('delete')}</p>
      <p className="text-sm">{t('deleteHint')}</p>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t('deleteConfirm', { phrase })}</span>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="min-h-12 rounded-md border border-border-strong bg-surface px-3"
        />
      </label>
      <Button
        className="self-start bg-gap text-white hover:bg-gap hover:brightness-90"
        disabled={typed.trim() !== phrase}
        loading={remove.isPending}
        onClick={() => remove.mutate(undefined, { onSuccess: () => router.push('/') })}
      >
        <Trash2 aria-hidden className="size-5" />
        {t('deleteButton')}
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-medium">{label}</span>
      {children}
    </div>
  );
}

function NavRow({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="-mx-2 flex items-center gap-3 rounded-md p-2 hover:bg-sunken">
      <span className="flex flex-1 flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted" />
    </Link>
  );
}
