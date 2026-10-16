import { setRequestLocale } from 'next-intl/server';
import { DeskSummaryScreen } from '../../_components/desk-summary';

/** S24 Session summary. */
export default async function DeskSummaryPage({
  params,
}: PageProps<'/[locale]/desk/[sid]/summary'>) {
  const { locale, sid } = await params;
  setRequestLocale(locale);
  return <DeskSummaryScreen sid={sid} />;
}
