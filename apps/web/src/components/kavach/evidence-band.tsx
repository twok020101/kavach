import { getTranslations } from 'next-intl/server';

/**
 * The one dark band in the app: the rules' sources, the honest wording count, the sample
 * notice and the global disclaimer of 11 §4. A footer or a page header, not a theme.
 */
export async function EvidenceBand({
  wordings,
  checked,
  as = 'footer',
}: {
  /** From the proof results; omitted when the API is unreachable, and the line is skipped. */
  wordings?: number;
  checked?: number;
  as?: 'footer' | 'header';
}) {
  const t = await getTranslations('common.evidence');
  const td = await getTranslations('common.disclaimer');
  const Tag = as;
  return (
    <Tag className="bg-primary-hover text-sm leading-relaxed text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 sm:px-6">
        <p>
          <span className="text-white/70">{t('sources')} </span>
          <span className="font-semibold text-accent">{t('irdai2024')}</span>
          <span className="text-white/70"> · </span>
          <span className="font-semibold text-accent">{t('irdai2020')}</span>
        </p>
        {wordings !== undefined && (
          <p>{t('wordings', { count: wordings, checked: checked ?? 0 })}</p>
        )}
        <p className="text-white/70">{t('sample')}</p>
        <p className="mt-2 border-t border-white/20 pt-2 text-white/85">{td('global')}</p>
      </div>
    </Tag>
  );
}
