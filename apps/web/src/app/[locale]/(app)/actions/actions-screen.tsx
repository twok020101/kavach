'use client';

import type { Household } from '@kavach/schemas';
import { ArrowRight, BellRing, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { useDate } from '@/components/plan/format';
import { PlanFrame } from '@/components/plan/plan-frame';
import { useActions } from '@/components/plan/queries';
import { Link } from '@/i18n/navigation';

export function ActionsScreen() {
  return <PlanFrame>{(household) => <Actions household={household} />}</PlanFrame>;
}

function Actions({ household }: { household: Household }) {
  const t = useTranslations('plan.actions');
  const tr = useTranslations('plan.replan');
  const date = useDate();
  const { data: actions } = useActions(household.id);
  if (!actions) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">{t('title')}</h1>
      {actions.length === 0 && <p className="text-muted">{t('empty')}</p>}
      <ul className="flex flex-col gap-2">
        {actions.map((a) => {
          const Icon = a.kind === 'reminder' ? BellRing : FileText;
          return (
            <li key={a.id}>
              <Link href={`/actions/${a.id}`} className="block">
                <Card className="flex items-center gap-3 p-3 hover:border-primary sm:p-3">
                  <Icon aria-hidden className="size-5 shrink-0 text-primary" />
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold">{a.title}</span>
                    <span className="text-sm text-muted">
                      {a.dueDate && `${t('due', { date: date(a.dueDate) })} · `}
                      {tr(`status.${a.status}`)}
                    </span>
                  </span>
                  <ArrowRight aria-hidden className="size-5 text-primary" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
