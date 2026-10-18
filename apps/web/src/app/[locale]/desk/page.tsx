import { setRequestLocale } from 'next-intl/server';
import { DeskStart } from './_components/desk-start';

/** S21 Hospital start: who is admitted, which language, start. */
export default async function DeskStartPage({ params, searchParams }: PageProps<'/[locale]/desk'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { demo, scene } = await searchParams;
  // Without a scene, a Singapore language opens the Singapore scene (the Tan family, S$).
  const picked =
    scene === 'maternity' || scene === 'singapore'
      ? scene
      : locale === 'zh' || locale === 'ms'
        ? 'singapore'
        : undefined;
  return <DeskStart demo={demo === '1'} scene={picked} />;
}
