'use client';

import type { Household, Locale } from '@kavach/schemas';
import { BellRing, Check, Copy, Link2, MessageCircle, UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useDate } from '@/components/plan/format';
import { Chip } from '@/components/setup/member-sheet';
import { Badge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAccess, useCreateInvite, useRemoveAccess, useSetAlertContact } from '@/lib/setup';

export function AccessScreen() {
  return <PlanFrame>{(household) => <Access household={household} />}</PlanFrame>;
}

function Access({ household }: { household: Household }) {
  const t = useTranslations('settings.access');
  const tc = useTranslations('common');
  const date = useDate();
  const { data } = useAccess(household.id);
  const remove = useRemoveAccess(household.id);
  const setAlert = useSetAlertContact(household.id);
  const member = (id?: string) => household.members.find((m) => m.id === id);
  // Without a choice yet, the person who set the family up hears the alerts.
  const alertContact =
    data?.alertContactMemberId ?? household.members.find((m) => m.relation === 'self')?.id;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted">{t('intro')}</p>
      </header>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <BellRing aria-hidden className="size-5 text-primary" />
          {t('alerts')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {household.members
            .filter((m) => m.relation === 'self' || m.relation === 'spouse' || m.age >= 18)
            .map((m) => (
              <Chip
                key={m.id}
                selected={alertContact === m.id}
                onClick={() => setAlert.mutate(m.id)}
              >
                {m.name}
              </Chip>
            ))}
        </div>
        <p className="text-sm text-muted">{t('alertsHint')}</p>
      </Card>

      <Card as="section" className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">{t('logins')}</h2>
        <ul className="flex flex-col gap-2">
          {data?.access.map((a) => {
            const m =
              member(a.memberId) ??
              (a.role === 'owner'
                ? member(household.members.find((x) => x.relation === 'self')?.id)
                : undefined);
            return (
              <li key={a.uid} className="flex items-center gap-3">
                {m ? <MemberAvatar member={m} className="size-10 text-base" /> : null}
                <span className="flex flex-1 flex-col">
                  <span className="font-semibold">{m?.name ?? a.uid}</span>
                  <span className="text-sm text-muted">
                    {a.role === 'owner' ? t('owner') : t('member')}
                  </span>
                </span>
                {a.role === 'member' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={remove.isPending && remove.variables === a.uid}
                    onClick={() => remove.mutate(a.uid)}
                  >
                    {t('remove')}
                  </Button>
                )}
              </li>
            );
          })}
          {data?.invites.map((i) => (
            <li key={i.id} className="flex items-center gap-3">
              {member(i.memberId) && (
                <MemberAvatar member={member(i.memberId)!} className="size-10 text-base" />
              )}
              <span className="flex flex-1 flex-col">
                <span className="font-semibold">{member(i.memberId)?.name}</span>
                <span className="text-sm text-muted">
                  {t('inviteSent', { date: date(i.createdAt.slice(0, 10)) })} ·{' '}
                  {tc(`languages.${i.language}`)}
                </span>
              </span>
              <Badge tone="partial">{t('pending')}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Invite household={household} />
    </div>
  );
}

function Invite({ household }: { household: Household }) {
  const t = useTranslations('settings.access');
  const ts = useTranslations('settings');
  const tc = useTranslations('common');
  const create = useCreateInvite(household.id);
  const invitable = household.members.filter((m) => m.relation !== 'self');
  const [memberId, setMemberId] = useState<string>();
  const [language, setLanguage] = useState<Locale>('en');
  const [phone, setPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string>();
  const chosen = household.members.find((m) => m.id === memberId);
  const url = create.data?.url;
  const owner = household.members.find((m) => m.relation === 'self')?.name ?? household.name;

  useEffect(() => {
    if (!url) return;
    QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#0f1b3d', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(undefined));
  }, [url]);

  const shareText = url && t('shareText', { inviter: owner, household: household.name, url });
  const waNumber = phone.replace(/\D/g, '');

  return (
    <Card as="section" className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <UserPlus aria-hidden className="size-5 text-primary" />
        {t('invite')}
      </h2>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">{t('inviteWho')}</legend>
        <div className="flex flex-wrap gap-2">
          {invitable.map((m) => (
            <Chip
              key={m.id}
              selected={memberId === m.id}
              onClick={() => {
                setMemberId(m.id);
                setLanguage(m.language);
                setPhone(m.phone ?? '');
                create.reset();
              }}
            >
              {m.name}
            </Chip>
          ))}
        </div>
      </fieldset>

      {chosen && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">{t('inviteLanguage')}</legend>
            <div className="flex gap-2">
              {(['hi', 'en'] as const).map((l) => (
                <Chip key={l} selected={language === l} onClick={() => setLanguage(l)}>
                  {tc(`languages.${l}`)}
                </Chip>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1">
            <span className="font-medium">{t('invitePhone')}</span>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98xxx xxxxx"
              className="min-h-12 rounded-md border border-border-strong bg-surface px-3"
            />
          </label>
          <Button
            className="self-start"
            loading={create.isPending}
            onClick={() =>
              create.mutate({
                memberId: chosen.id,
                language,
                phone: waNumber ? `+${waNumber}` : undefined,
              })
            }
          >
            <Link2 aria-hidden className="size-5" />
            {t('createLink')}
          </Button>
        </>
      )}

      {url && chosen && (
        <div className="flex flex-col gap-3 rounded-md bg-sunken p-4 sm:flex-row sm:items-start">
          {qr && (
            <div
              className="size-40 shrink-0 overflow-hidden rounded-md bg-white p-1"
              role="img"
              aria-label={url}
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          )}
          <div className="flex min-w-0 flex-col gap-3">
            <p className="font-medium">{t('linkReady', { name: chosen.name })}</p>
            <code className="break-all rounded-sm bg-surface p-2 text-sm">{url}</code>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard?.writeText(url);
                  setCopied(true);
                }}
              >
                {copied ? (
                  <Check aria-hidden className="size-5" />
                ) : (
                  <Copy aria-hidden className="size-5" />
                )}
                {copied ? t('copied') : t('copy')}
              </Button>
              <a
                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(shareText ?? url)}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <MessageCircle aria-hidden className="size-5" />
                {t('sendWhatsApp')}
              </a>
            </div>
          </div>
        </div>
      )}
      {create.isError && <p className="rounded-md bg-gap-bg p-3 text-gap">{ts('error')}</p>}
    </Card>
  );
}
