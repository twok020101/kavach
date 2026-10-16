import { formatInr } from '@kavach/engine';
import type { Citation, Household, PolicyDraft } from '@kavach/schemas';
import type { useTranslations } from 'next-intl';

type T = ReturnType<typeof useTranslations<'documents'>>;

export type Term = { key: string; label: string; value: string; citation?: Citation };

/**
 * The terms a claim depends on, each with the citation that supports it.
 * Works for a confirmed Policy and for a draft read from a document.
 */
export function keyTerms(policy: PolicyDraft, t: T): Term[] {
  const { terms } = policy;
  const cite = terms.citations;
  const list: (Term | false)[] = [
    {
      key: 'sumInsured',
      label: t('facts.sumInsured'),
      value: formatInr(policy.sumInsured),
      citation: cite.sumInsured,
    },
    {
      key: 'roomRent',
      label: t('facts.roomRent'),
      value: terms.roomRentLimitPerDay
        ? t('values.perDay', { amount: formatInr(terms.roomRentLimitPerDay) })
        : t('values.noRoomLimit'),
      citation: cite.roomRentLimitPerDay,
    },
    (terms.icuLimitPerDay !== undefined || Boolean(cite.icu)) && {
      key: 'icu',
      label: t('facts.icu'),
      value: terms.icuLimitPerDay
        ? t('values.perDay', { amount: formatInr(terms.icuLimitPerDay) })
        : t('values.icuAsBilled'),
      citation: cite.icuLimitPerDay ?? cite.icu,
    },
    {
      key: 'proportionateDeduction',
      label: t('facts.proportionateDeduction'),
      value: terms.proportionateDeduction ? t('values.applies') : t('values.waived'),
      citation: cite.proportionateDeduction,
    },
    {
      key: 'copay',
      label: t('facts.copay'),
      value:
        terms.copayPercent === 0
          ? t('values.none')
          : terms.copayFromAge
            ? t('values.copayFromAge', { percent: terms.copayPercent, age: terms.copayFromAge })
            : t('values.copay', { percent: terms.copayPercent }),
      citation: cite.copayPercent,
    },
    (terms.deductible > 0 || Boolean(cite.deductible)) && {
      key: 'deductible',
      label: t('facts.deductible'),
      value: terms.deductible
        ? t('values.perYear', { amount: formatInr(terms.deductible) })
        : t('values.none'),
      citation: cite.deductible,
    },
    Boolean(cite.nonPayables) && {
      key: 'nonPayables',
      label: t('facts.nonPayables'),
      value: t('values.nonPayables'),
      citation: cite.nonPayables,
    },
  ];
  return list.filter((term): term is Term => Boolean(term));
}

export function memberNames(household: Household, memberIds: string[]) {
  return memberIds.map((id) => household.members.find((m) => m.id === id)?.name ?? id).join(', ');
}
