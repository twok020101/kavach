'use client';

import type { Household, Member } from '@kavach/schemas';
import { Hospital, MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Amount } from '@/components/kavach/amount';
import { MemberAvatar } from '@/components/kavach/member-avatar';
import { Reveal } from '@/components/kavach/reveal';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Link } from '@/i18n/navigation';
import { usePlan } from './queries';

const WA_NUMBER = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER?.replace(/\D/g, '');

/**
 * S09m: the home a family member sees (Kamala). One big button, her own cover in plain words,
 * who to call, and the WhatsApp door. Nothing to work out.
 */
export function MemberHome({
  household,
  member,
  onFullView,
}: {
  household: Household;
  member: Member;
  onFullView: () => void;
}) {
  const t = useTranslations('plan.home');
  const tc = useTranslations('common');
  const { data: plan } = usePlan(household.id);
  const health = plan?.coverMap.cells.find((c) => c.memberId === member.id && c.risk === 'health');
  const policies = household.policies.filter((p) => p.coveredMemberIds.includes(member.id));
  const contact =
    household.members.find((m) => m.id === household.alertContactMemberId) ??
    household.members.find((m) => m.relation === 'self');

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 text-lg">
      <header className="flex items-center gap-3">
        <MemberAvatar member={member} className="size-14 text-xl" />
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {t('helloMember', { name: member.name.split(' ')[0] ?? member.name })}
        </h1>
      </header>

      <Reveal>
        <Link
          href="/desk"
          className={buttonClasses({ variant: 'accent', size: 'hero', className: 'text-left' })}
        >
          <Hospital aria-hidden className="size-9 shrink-0" />
          <span className="flex flex-1 flex-col">
            <span>{tc('atHospital')}</span>
            <span className="text-base font-medium opacity-80">{t('hospitalSub')}</span>
          </span>
        </Link>
      </Reveal>

      <Reveal delay={0.05}>
        <Card as="section" aria-labelledby="your-cover" className="flex flex-col gap-3">
          <h2 id="your-cover" className="flex items-center gap-2 font-display text-xl font-bold">
            <ShieldCheck aria-hidden className="size-6 text-safe" />
            {t('yourCover')}
          </h2>
          {health && <StatusBadge status={health.status} className="self-start text-base" />}
          <ul className="hairline">
            {policies.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold">{p.productName}</span>
                  <span className="block text-base text-muted">{p.insurer}</span>
                </span>
                <Amount value={p.sumInsured} className="font-display font-bold" />
              </li>
            ))}
            {policies.length === 0 && <li className="py-2 text-muted">{t('noCover')}</li>}
          </ul>
        </Card>
      </Reveal>

      <Reveal delay={0.1} className="flex flex-col gap-3">
        {contact && contact.id !== member.id && (
          <a
            href={contact.phone ? `tel:${contact.phone}` : undefined}
            className={buttonClasses({
              variant: 'secondary',
              size: 'desk',
              className: 'justify-start',
            })}
          >
            <Phone aria-hidden className="size-6" />
            {t('call', { name: contact.name.split(' ')[0] ?? contact.name })}
          </a>
        )}
        <a
          href={WA_NUMBER ? `https://wa.me/${WA_NUMBER}` : undefined}
          className={buttonClasses({ variant: 'soft', size: 'desk', className: 'justify-start' })}
        >
          <MessageCircle aria-hidden className="size-6" />
          {t('whatsappLine')}
        </a>
      </Reveal>

      <button
        type="button"
        onClick={onFullView}
        className="min-h-12 self-center text-base font-semibold text-primary underline underline-offset-4"
      >
        {t('fullView')}
      </button>
    </div>
  );
}
