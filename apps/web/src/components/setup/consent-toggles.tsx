'use client';

import { ConsentPurpose, type Locale } from '@kavach/schemas';
import { useLocale, useTranslations } from 'next-intl';
import { marketForLocale } from '@/lib/market';
import { Icon } from '../kavach/icon';
import { cn } from '../ui/cn';

/** The one purpose Kavach cannot work without; the rest are optional. */
const ESSENTIAL: ConsentPurpose = 'planning';

/** One quiet icon per purpose at the right of the card, and one for its footnote (Stitch 04). */
const ICONS: Record<ConsentPurpose, { card: string; note: string }> = {
  planning: { card: 'groups', note: 'lock_clock' },
  documents: { card: 'description', note: 'shield' },
  health: { card: 'clinical_notes', note: 'toggle_on' },
  whatsapp: { card: 'chat', note: 'block' },
};

/**
 * One card per purpose (DPDP: purpose-specific consent), from the Stitch consent screen: a large
 * checkbox, the purpose with an ESSENTIAL or OPTIONAL pill and a quiet icon, the description, and
 * a serif footnote with what is never done with it, or, in ochre, what you lose by leaving an
 * optional one off. A card that is on sits white with an indigo ring; one that is off sits on the
 * tinted surface with an empty box. Used on S03 and in Settings.
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
  // Singapore readers read "every dollar" where India's say "every rupee" (`hintSg`).
  const sg = marketForLocale(useLocale() as Locale) === 'SG';
  const hint = (purpose: ConsentPurpose) =>
    sg && tp.has(`${purpose}.hintSg`) ? tp(`${purpose}.hintSg`) : tp(`${purpose}.hint`);
  return (
    <ul className="flex flex-col gap-4">
      {ConsentPurpose.options.map((purpose) => {
        const on = value.includes(purpose);
        const essential = purpose === ESSENTIAL;
        // An optional purpose that is off says, in ochre, what leaving it off changes.
        const warn = !on && tp.has(`${purpose}.warn`);
        return (
          <li key={purpose}>
            <label
              className={cn(
                'consent-card group relative flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-[background-color,border-color,box-shadow] duration-200 sm:p-5',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
                on
                  ? 'border-primary-container/25 bg-surface shadow-1 hover:border-primary-container'
                  : 'border-transparent bg-surface-container-low hover:bg-surface-container',
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
                  'consent-box mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150',
                  on
                    ? 'border-primary bg-primary text-on-primary shadow-1'
                    : 'border-outline-variant bg-surface-container-highest text-transparent',
                )}
              >
                <Icon name="check" weight={600} className="text-lg" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-start gap-3">
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-display text-title-md text-on-surface sm:text-[1.0625rem]">
                      {tp(`${purpose}.label`)}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.06em]',
                        essential
                          ? 'bg-surface-container-high text-primary'
                          : 'bg-surface-container-highest text-on-surface-variant',
                      )}
                    >
                      {essential ? t('essential') : t('optional')}
                    </span>
                  </span>
                  <Icon
                    name={ICONS[purpose].card}
                    className={cn(
                      'mt-0.5 text-xl',
                      on ? 'text-primary/70' : 'text-on-surface-variant',
                    )}
                  />
                </span>
                <span className="text-body-md text-on-surface-variant">{hint(purpose)}</span>
                {/* The footnote: what is never done with it, or what an optional one changes. */}
                <span
                  className={cn(
                    'mt-0.5 flex items-start gap-1.5 font-serif text-[0.8125rem] leading-5',
                    warn ? 'text-secondary' : 'text-on-surface-variant/80',
                  )}
                >
                  <Icon name={warn ? 'info' : ICONS[purpose].note} className="mt-[3px] text-sm" />
                  {tp(warn ? `${purpose}.warn` : `${purpose}.note`)}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}
