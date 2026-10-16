'use client';

import type { Locale } from '@kavach/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Info } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Spinner } from '@/components/ui/spinner';
import { Link, useRouter } from '@/i18n/navigation';
import { deskClient } from '@/lib/desk-client';
import { CloseIcon, DeskHeader } from './desk-header';

const DEMO_PATIENT = 'mem_suresh';

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
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-5">
        {demo && (
          <p className="flex gap-2 rounded-md bg-citation-bg p-3 text-citation">
            <Info aria-hidden className="mt-1 size-5 shrink-0" />
            {t('demoNote')}
          </p>
        )}

        <fieldset>
          <legend className="mb-3 font-display text-2xl font-bold">{t('who')}</legend>
          {household.isPending ? (
            <Spinner label={tc('loading')} />
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
              {household.data?.members.map((m) => (
                <label
                  key={m.id}
                  className={cn(
                    'flex min-h-20 cursor-pointer items-center gap-3 rounded-md border-2 p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                    patientId === m.id
                      ? 'border-primary bg-primary-soft'
                      : 'border-border-strong bg-surface',
                  )}
                >
                  <input
                    type="radio"
                    name="patient"
                    value={m.id}
                    checked={patientId === m.id}
                    onChange={() => setPatientId(m.id)}
                    className="sr-only"
                  />
                  <MemberAvatar member={m} />
                  <span className="flex flex-col">
                    <span className="font-semibold">{m.name.split(' ')[0]}</span>
                    <span className="text-sm text-muted">
                      {tc(`relation.${m.relation}`)}, {m.age}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-display text-2xl font-bold">{t('language')}</legend>
          <div className="grid grid-cols-2 gap-3">
            {(['hi', 'en'] as const).map((l) => (
              <label
                key={l}
                lang={l}
                className={cn(
                  'flex min-h-16 cursor-pointer items-center justify-center rounded-md border-2 px-3 text-lg font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                  language === l
                    ? 'border-primary bg-primary-soft'
                    : 'border-border-strong bg-surface',
                )}
              >
                <input
                  type="radio"
                  name="language"
                  value={l}
                  checked={language === l}
                  onChange={() => setLanguage(l)}
                  className="sr-only"
                />
                {tc(`languages.${l}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <Button
            variant="accent"
            size="desk"
            disabled={!patientId}
            loading={start.isPending}
            onClick={() => start.mutate()}
          >
            {t('start')}
            <ArrowRight aria-hidden className="size-6" />
          </Button>
          {!patientId && <p className="text-center text-muted">{t('pickFirst')}</p>}
          {start.isError && (
            <p role="alert" className="text-gap">
              {tc('error')}
            </p>
          )}
          <p className="text-sm text-muted">{t('privacy')}</p>
        </div>
      </main>
    </>
  );
}
