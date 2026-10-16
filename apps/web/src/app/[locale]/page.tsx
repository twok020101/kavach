import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Shield } from 'lucide-react';

/** S01 Landing. Placeholder until the landing package lands (see PROGRESS.md). */
export default async function LandingPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('landing');

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center gap-2 text-primary">
        <Shield aria-hidden className="size-8" />
        <span className="font-display text-2xl font-bold">Kavach</span>
      </div>
      <h1 className="font-display text-4xl font-bold leading-tight">{t('headline')}</h1>
      <p className="text-lg text-muted">{t('subhead')}</p>
    </main>
  );
}
