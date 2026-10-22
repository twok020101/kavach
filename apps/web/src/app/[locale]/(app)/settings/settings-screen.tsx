'use client';

import type { ConsentPurpose, Household } from '@kavach/schemas';
import { clsx } from 'clsx';
import { Download, LogOut, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { PageHeader, sectionTitle } from '@/components/app/page-parts';
import { Icon } from '@/components/kavach/icon';
import { LanguageSwitch } from '@/components/kavach/language-switch';
import { PlanFrame } from '@/components/plan/plan-frame';
import { ConsentToggles } from '@/components/setup/consent-toggles';
import { Chip } from '@/components/setup/member-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link, useRouter } from '@/i18n/navigation';
import { signOutUser } from '@/lib/firebase';
import { rememberHouseholdId, rememberMemberId } from '@/lib/session';
import { downloadExport, useDeleteHousehold, useSetConsents } from '@/lib/setup';
import { TEXT_SCALES, type ThemePref, useAppearance } from '@/lib/theme';

export function SettingsScreen() {
  return <PlanFrame>{(household) => <Settings household={household} />}</PlanFrame>;
}

function Settings({ household }: { household: Household }) {
  const t = useTranslations('settings');
  const router = useRouter();
  const { theme, setTheme, textScale, setTextScale } = useAppearance();
  // The demo lets anyone see the member home: a parent who does not speak English first (Kamala), else any adult.
  const adults = household.members.filter((m) => m.relation !== 'self' && m.age >= 18);
  const memberToPreview = household.isDemo
    ? (adults.find((m) => m.relation === 'parent' && m.language !== 'en' && m.age < 60) ??
      adults.find((m) => m.relation === 'parent') ??
      adults[0])
    : undefined;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={t('title')} />

      {/* Phone: the sections that are not tabs live here. */}
      <Card className="p-0 sm:p-0 lg:hidden">
        <ul className="hairline">
          <NavRow
            href="/timeline"
            icon="timeline"
            label={t('family.timeline')}
            hint={t('family.timelineHint')}
          />
          <NavRow
            href="/claims"
            icon="receipt_long"
            label={t('family.claims')}
            hint={t('family.claimsHint')}
          />
          <NavRow
            href="/actions"
            icon="checklist"
            label={t('family.actions')}
            hint={t('family.actionsHint')}
          />
        </ul>
      </Card>

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
          <div className="flex flex-wrap gap-2">
            {TEXT_SCALES.map((scale) => (
              <Chip key={scale} selected={textScale === scale} onClick={() => setTextScale(scale)}>
                <span
                  className={
                    scale === 'normal' ? 'text-base' : scale === 'large' ? 'text-lg' : 'text-xl'
                  }
                >
                  {t(`appearance.textSizes.${scale}`)}
                </span>
              </Chip>
            ))}
          </div>
        </Row>
      </Section>

      <Section title={t('family.title')} flush>
        <ul className="hairline">
          <NavRow
            href="/settings/access"
            icon="group"
            label={t('family.access')}
            hint={t('family.accessHint')}
          />
          {!household.isDemo && (
            <NavRow
              href="/setup/family/confirm"
              icon="edit"
              label={t('family.edit')}
              hint={t('family.editHint')}
            />
          )}
          {household.isDemo && (
            <NavRow
              href="/demo"
              icon="restart_alt"
              label={t('family.demo')}
              hint={t('family.demoHint')}
            />
          )}
          {memberToPreview && (
            <li>
              <button
                type="button"
                onClick={() => {
                  rememberMemberId(memberToPreview.id);
                  router.push('/home');
                }}
                className="press flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-sunken sm:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent-ink dark:text-text">
                  <Icon name="visibility" className="text-xl" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display text-title-md text-on-surface">
                    {t('family.viewAs', { name: memberToPreview.name.split(' ')[0] ?? '' })}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    {t('family.viewAsHint')}
                  </span>
                </span>
                <Icon name="chevron_right" className="shrink-0 text-2xl text-outline" />
              </button>
            </li>
          )}
        </ul>
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
        <Link href="/proof" className="font-medium text-primary underline underline-offset-4">
          {t('about.proof')}
        </Link>
      </Section>

      <Button
        variant="ghost"
        className="self-start"
        onClick={async () => {
          await signOutUser();
          rememberHouseholdId(undefined);
          rememberMemberId(undefined);
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

function Section({
  title,
  flush = false,
  children,
}: {
  title: string;
  /** Rows that run edge to edge (nav lists). */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      as="section"
      className={flush ? 'flex flex-col gap-1 p-0 sm:p-0' : 'flex flex-col gap-4 sm:p-6'}
    >
      {/* clsx, not cn: tailwind-merge reads text-headline-sm as a colour and drops it. */}
      <h2 className={clsx(sectionTitle, flush && 'px-4 pt-4 sm:px-5 sm:pt-5')}>{title}</h2>
      {children}
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-body-md font-medium text-on-surface">{label}</span>
      {children}
    </div>
  );
}

function NavRow({
  href,
  icon,
  label,
  hint,
}: {
  href:
    '/timeline' | '/claims' | '/actions' | '/settings/access' | '/setup/family/confirm' | '/demo';
  /** Material Symbols ligature for the tile. */
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <li>
      <Link href={href} className="press flex items-center gap-3 px-4 py-4 hover:bg-sunken sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
          <Icon name={icon} className="text-xl" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-display text-title-md text-on-surface">{label}</span>
          <span className="text-body-sm text-on-surface-variant">{hint}</span>
        </span>
        <Icon name="chevron_right" className="shrink-0 text-2xl text-outline" />
      </Link>
    </li>
  );
}
