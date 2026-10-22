import type { Country } from '@kavach/engine';
import { getTranslations } from 'next-intl/server';

const ROWS = [
  ['reader', 'notInsurer'],
  ['cites', 'notGuarantee'],
  ['consent', 'notPayments'],
] as const;

/**
 * Two plain columns saying what Kavach is and is not (plain-register spec, trust rule 4). In
 * Singapore the citing row speaks of dollars (`rows.citesSg`).
 */
export async function IsIsNot({ market = 'IN' }: { market?: Country }) {
  const t = await getTranslations('common.isNot');
  const row = (key: string) => (market === 'SG' && t.has(`rows.${key}Sg`) ? `${key}Sg` : key);
  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr>
          <th scope="col" className="label border-b border-border pb-2 pr-4 text-left">
            {t('isTitle')}
          </th>
          <th scope="col" className="label border-b border-border pb-2 text-left">
            {t('notTitle')}
          </th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map(([is, not]) => (
          <tr key={is}>
            <td className="border-b border-border py-3 pr-4 align-top">{t(`rows.${row(is)}`)}</td>
            <td className="border-b border-border py-3 align-top text-muted">{t(`rows.${not}`)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
