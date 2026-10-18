'use client';

import { ConsentPurpose } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { cn } from '../ui/cn';

/** The one purpose Kavach cannot work without; the rest are optional. */
const ESSENTIAL: ConsentPurpose = 'planning';

/**
 * One switch per purpose (DPDP: purpose-specific consent). Each card says what the purpose is
 * for and whether it is essential or optional, so the choice is informed. Used on S03 and in
 * Settings.
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
    <ul className="flex flex-col gap-2">
      {ConsentPurpose.options.map((purpose) => {
        const on = value.includes(purpose);
        const essential = purpose === ESSENTIAL;
        return (
          <li key={purpose}>
            <label
              className={cn(
                'press flex min-h-16 cursor-pointer items-start gap-3 rounded-md border bg-surface p-4',
                on
                  ? 'border-primary bg-primary-soft/40'
                  : 'border-border hover:border-border-strong',
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-primary"
                checked={on}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...value, purpose] : value.filter((p) => p !== purpose),
                  )
                }
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold leading-snug">{tp(`${purpose}.label`)}</span>
                  <Badge tone={essential ? 'primary' : 'neutral'} className="text-xs">
                    {essential ? t('essential') : t('optional')}
                  </Badge>
                </span>
                <span className="text-sm text-muted">{tp(`${purpose}.hint`)}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
