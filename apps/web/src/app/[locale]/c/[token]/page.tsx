import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AnswerCard } from '@/components/kavach/answer-card';
import { Logo } from '@/components/kavach/logo';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { fetchCardShare } from '@/lib/card-share';

/** The full card behind a WhatsApp link (W2, W3): every card of one desk answer, read-only. */
export default async function SharedCardPage({ params }: PageProps<'/[locale]/c/[token]'>) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('whatsapp.page');
  const share = await fetchCardShare(token);

  return (
    <div data-mode="desk" className="min-h-dvh bg-bg text-text">
      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <Logo />
        {share ? (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="font-display text-2xl font-bold">
                {t('title', { patient: share.patientName })}
              </h1>
              {share.hospitalName && <p className="text-muted">{share.hospitalName}</p>}
              <p className="text-lg">{share.text}</p>
            </header>
            <div className="flex flex-col gap-4">
              {share.cards.map((card, i) => (
                <AnswerCard key={card.id} card={card} index={i} />
              ))}
            </div>
            <p className="text-sm text-muted">{t('disclaimer')}</p>
          </>
        ) : (
          <p className="rounded-md bg-gap-bg p-4 text-gap">{t('notFound')}</p>
        )}
        <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
          {t('openApp')}
        </Link>
      </main>
    </div>
  );
}
