'use client';

import type { Locale } from '@kavach/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Info, Mic } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useRouter } from '@/i18n/navigation';
import { deskClient } from '@/lib/desk-client';
import { CloseIcon, DeskHeader } from './desk-header';

const DEMO_PATIENT = 'mem_suresh';

/** S21 Hospital start: who is admitted, which language, one big Start. Fewest elements of any screen. */
export function DeskStart({ demo }: { demo: boolean }) {
  const t = useTranslations('desk.start');
  const tc = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(demo ? DEMO_PATIENT : null);
  const [language, setLanguage] = useState<Locale>(demo ? 'hi' : locale);

  const household = useQuery({ queryKey: ['desk', 'household'], queryFn: deskClient.getHousehold });
  const start = useMutation({
    mutationFn: () => deskClient.startSession({ patientMemberId: patientId!, language }),
    onSuccess: ({ sessionId }) =>
      router.push(
        { pathname: `/desk/${sessionId}`, query: demo ? { demo: '1' } : {} },
        { locale: language },
      ),
  });

  const tile =
    'press relative flex cursor-pointer items-center gap-3 rounded-md border-2 bg-surface p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary';
  const selectedTile = 'border-primary bg-primary-soft';
  const idleTile = 'border-border hover:border-border-strong';

  return (
    <>
      <DeskHeader
        title={t('title')}
        query={demo ? { demo: '1' } : undefined}
        action={
          <Link
            href="/"
            aria-label={tc('close')}
            className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'min-w-12 px-0' })}
          >
            <CloseIcon />
          </Link>
        }
      />
      <main className="mx-auto flex max-w-2xl flex-col gap-7 px-4 pb-40 pt-5">
        {demo && (
          <p className="panel flex gap-2 text-base">
            <Info aria-hidden className="mt-1 size-5 shrink-0" />
            {t('demoNote')}
          </p>
        )}

        <fieldset>
          <legend className="mb-3 font-display text-2xl font-bold">{t('who')}</legend>
          {household.isPending ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {household.data?.members.map((m) => {
                const on = patientId === m.id;
                return (
                  <label key={m.id} className={cn(tile, 'min-h-20', on ? selectedTile : idleTile)}>
                    <input
                      type="radio"
                      name="patient"
                      value={m.id}
                      checked={on}
                      onChange={() => setPatientId(m.id)}
                      className="sr-only"
                    />
                    <MemberAvatar member={m} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-semibold">{m.name.split(' ')[0]}</span>
                      <span className="text-sm text-muted">
                        {tc(`relation.${m.relation}`)}, {m.age}
                      </span>
                    </span>
                    {on && (
                      <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md bg-primary text-on-primary">
                        <Check aria-hidden className="size-4" strokeWidth={3} />
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-display text-2xl font-bold">{t('language')}</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['hi', 'en'] as const).map((l) => {
              const on = language === l;
              return (
                <label
                  key={l}
                  lang={l}
                  className={cn(
                    tile,
                    'min-h-16 justify-center text-lg font-semibold',
                    on ? selectedTile : idleTile,
                  )}
                >
                  <input
                    type="radio"
                    name="language"
                    value={l}
                    checked={on}
                    onChange={() => setLanguage(l)}
                    className="sr-only"
                  />
                  {on && <Check aria-hidden className="size-5 text-primary" strokeWidth={3} />}
                  {tc(`languages.${l}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        <p className="text-base text-muted">{t('privacy')}</p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 py-3">
          <Button
            variant="accent"
            size="desk"
            disabled={!patientId}
            loading={start.isPending}
            onClick={() => start.mutate()}
          >
            <Mic aria-hidden className="size-6" />
            {t('start')}
            <ArrowRight aria-hidden className="size-6" />
          </Button>
          {!patientId && <p className="text-center text-base text-muted">{t('pickFirst')}</p>}
          {start.isError && (
            <p role="alert" className="text-center text-gap">
              {tc('error')}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
