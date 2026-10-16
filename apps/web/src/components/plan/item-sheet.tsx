'use client';

import type { Household, Recommendation } from '@kavach/schemas';
import { ArrowLeft, ExternalLink, Handshake } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Amount } from '../kavach/amount';
import { Button } from '../ui/button';
import { useRecommendationTitle } from './recommendation';
import { RuleList } from './rule-list';
import { Sheet } from './sheet';

type Field = 'cover' | 'people' | 'city' | 'health';

/** S11 plan item detail, and S13 partner hand-off inside the same sheet. */
export function ItemSheet({
  household,
  rec,
  onClose,
}: {
  household: Household;
  rec: Recommendation | undefined;
  onClose: () => void;
}) {
  const title = useRecommendationTitle(household);
  return (
    <Sheet open={!!rec} onClose={onClose} title={rec ? title(rec) : ''}>
      {rec && <ItemDetail key={rec.id} household={household} rec={rec} />}
    </Sheet>
  );
}

function ItemDetail({ household, rec }: { household: Household; rec: Recommendation }) {
  const t = useTranslations('settings.plan');
  const title = useRecommendationTitle(household);
  const [handoff, setHandoff] = useState(false);
  const names = rec.memberIds
    .map((id) => household.members.find((m) => m.id === id)?.name ?? id)
    .join(', ');

  if (handoff)
    return (
      <PartnerHandoff
        household={household}
        rec={rec}
        item={title(rec)}
        onBack={() => setHandoff(false)}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h3 className="font-semibold text-muted">{t('itemWhat')}</h3>
        <p className="text-lg">
          {t.rich('itemCover', {
            amount: () => <Amount value={rec.cover} className="font-semibold" />,
          })}
        </p>
        {names && <p>{t('itemWho', { names })}</p>}
        <p>
          {t.rich('itemPremium', {
            amount: () => <Amount value={rec.premiumMonthly} className="font-semibold" />,
          })}
        </p>
        <p className="text-sm text-muted">{t('itemIllustrative')}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="font-semibold text-muted">{t('itemWhy')}</h3>
        <RuleList ids={rec.ruleIds} />
      </section>
      <Button size="lg" onClick={() => setHandoff(true)}>
        <Handshake aria-hidden className="size-5" />
        {t('partner')}
      </Button>
    </div>
  );
}

function PartnerHandoff({
  household,
  rec,
  item,
  onBack,
}: {
  household: Household;
  rec: Recommendation;
  item: string;
  onBack: () => void;
}) {
  const t = useTranslations('settings.plan');
  const hasHealth = rec.memberIds.some(
    (id) => (household.members.find((m) => m.id === id)?.conditions.length ?? 0) > 0,
  );
  const fields: Field[] = ['cover', 'people', 'city', ...(hasHealth ? (['health'] as const) : [])];
  // Nothing is shared unless ticked; health is never ticked for you.
  const [shared, setShared] = useState<Field[]>(['cover']);
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg">{t('partnerIntro', { item })}</p>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t('partnerShare')}</legend>
        {fields.map((f) => (
          <label
            key={f}
            className="flex min-h-12 items-center gap-3 rounded-md border border-border px-3"
          >
            <input
              type="checkbox"
              className="size-5 accent-[var(--primary)]"
              checked={shared.includes(f)}
              onChange={(e) =>
                setShared((s) => (e.target.checked ? [...s, f] : s.filter((x) => x !== f)))
              }
            />
            {t(`partnerFields.${f}`)}
          </label>
        ))}
      </fieldset>
      {sent ? (
        <p className="rounded-md bg-accent-soft p-4 font-medium" role="status">
          {t('partnerDemo')}
        </p>
      ) : (
        <Button size="lg" onClick={() => setSent(true)}>
          <ExternalLink aria-hidden className="size-5" />
          {t('partnerContinue')}
        </Button>
      )}
      <Button variant="ghost" className="self-start" onClick={onBack}>
        <ArrowLeft aria-hidden className="size-5" />
        {t('partnerBack')}
      </Button>
    </div>
  );
}
