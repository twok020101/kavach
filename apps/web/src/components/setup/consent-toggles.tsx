'use client';

import { ConsentPurpose } from '@kavach/schemas';
import {
  Check,
  FileText,
  HeartPulse,
  Lock,
  MessageCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { cn } from '../ui/cn';

/** The one purpose Kavach cannot work without; the rest are optional. */
const ESSENTIAL: ConsentPurpose = 'planning';

/** One quiet icon per purpose, at the right of the card (Stitch 04). */
const ICONS: Record<ConsentPurpose, LucideIcon> = {
  planning: Users,
  documents: FileText,
  health: HeartPulse,
  whatsapp: MessageCircle,
};

/**
 * One card per purpose (DPDP: purpose-specific consent), with a large checkbox, the purpose and
 * whether it is essential or optional, a two-line description and, in serif, what is never done
 * with it, so the choice is informed. A card that is on sits white with an indigo border; one
 * that is off sits on the sunken surface. Used on S03 and in Settings.
 */
export function ConsentToggles({
  value,
  onChange,
  disabled,
}: {
  value: ConsentPurpose[];
  onChange: (next: ConsentPurpose[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('setup.consent');
  const tp = useTranslations('setup.consent.purposes');
  return (
    <ul className="flex flex-col gap-3">
      {ConsentPurpose.options.map((purpose) => {
        const on = value.includes(purpose);
        const essential = purpose === ESSENTIAL;
        const Icon = ICONS[purpose];
        return (
          <li key={purpose}>
            <label
              className={cn(
                'press relative flex min-h-16 cursor-pointer items-start gap-4 rounded-md border-2 p-4 transition-colors duration-150',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                on
                  ? 'border-primary bg-surface'
                  : 'border-transparent bg-sunken hover:border-border-strong',
                disabled && 'cursor-default opacity-70',
              )}
            >
              <input
                type="checkbox"
                className="peer sr-only"
                checked={on}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...value, purpose] : value.filter((p) => p !== purpose),
                  )
                }
              />
              {/* The visible box: large, with a tick when on (state by icon, not colour alone). */}
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm border-2 transition-colors duration-150',
                  on
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border-strong bg-surface text-transparent',
                )}
              >
                <Check className="size-5" strokeWidth={3} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-start gap-2">
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-lg font-semibold leading-snug">
                      {tp(`${purpose}.label`)}
                    </span>
                    <Badge tone={essential ? 'primary' : 'neutral'} className="text-xs uppercase">
                      {essential ? t('essential') : t('optional')}
                    </Badge>
                  </span>
                  <Icon
                    aria-hidden
                    className={cn('mt-1 size-5 shrink-0', on ? 'text-primary' : 'text-muted')}
                  />
                </span>
                <span className="text-base text-muted">{tp(`${purpose}.hint`)}</span>
                {/* What is never done with it: the line that makes the choice an informed one. */}
                <span className="flex items-start gap-1.5 font-serif text-sm text-muted">
                  <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  {tp(`${purpose}.note`)}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
