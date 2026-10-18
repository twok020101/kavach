import { setRequestLocale } from 'next-intl/server';
import { DeskSessionScreen } from '../_components/desk-session';

/** S22 desk session (text mode) with S23 answer cards. */
export default async function DeskSessionPage({
  params,
  searchParams,
}: PageProps<'/[locale]/desk/[sid]'>) {
  const { locale, sid } = await params;
  setRequestLocale(locale);
  const { demo, scene } = await searchParams;
  return (
    <DeskSessionScreen
      sid={sid}
      demo={demo === '1'}
      scene={scene === 'maternity' ? 'maternity' : undefined}
    />
  );
}
