'use client';

import { ConsentPurpose } from '@kavach/schemas';
import { useTranslations } from 'next-intl';
import { cn } from '../ui/cn';

/** One switch per purpose (DPDP: purpose-specific consent). Used on S03 and in Settings. */
export function ConsentToggles({
  value,
  onChange,
  disabled,
}: {
  value: ConsentPurpose[];
  onChange: (next: ConsentPurpose[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('setup.consent.purposes');
  return (
    <ul className="flex flex-col gap-2">
      {ConsentPurpose.options.map((purpose) => {
        const on = value.includes(purpose);
        return (
          <li key={purpose}>
            <label
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-md border bg-surface p-4',
                on ? 'border-primary' : 'border-border',
              )}
            >
              <input
                type="checkbox"
                className="mt-1 size-5 shrink-0 accent-[var(--primary)]"
                checked={on}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...value, purpose] : value.filter((p) => p !== purpose),
                  )
                }
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{t(`${purpose}.label`)}</span>
                <span className="text-sm text-muted">{t(`${purpose}.hint`)}</span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
