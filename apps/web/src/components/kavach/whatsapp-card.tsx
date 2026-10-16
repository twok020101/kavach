import { MessageCircle, QrCode } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import QRCode from 'qrcode';
import { Card } from '../ui/card';

/** The sandbox number and join message, or null when not configured. */
function sandboxJoin() {
  const number = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_NUMBER?.trim();
  const join = process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN?.trim();
  return number && join ? { number, join } : null;
}

/** wa.me link that opens WhatsApp with the sandbox join message, or null when not configured. */
function sandboxLink() {
  const sandbox = sandboxJoin();
  if (!sandbox) return null;
  return `https://wa.me/${sandbox.number.replace(/\D/g, '')}?text=${encodeURIComponent(sandbox.join)}`;
}

/** The WhatsApp door on the landing page: a QR code that joins the Twilio sandbox. */
export async function WhatsAppCard() {
  const t = await getTranslations('landing.whatsapp');
  const sandbox = sandboxJoin();
  const link = sandboxLink();
  const svg = link
    ? await QRCode.toString(link, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#0f1b3d', light: '#ffffff' },
      })
    : null;

  return (
    <Card as="section" aria-labelledby="whatsapp-title" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-safe-bg text-safe">
          <MessageCircle aria-hidden className="size-6" />
        </span>
        <h2 id="whatsapp-title" className="font-display text-2xl font-bold">
          {t('title')}
        </h2>
      </div>
      <p className="text-lg">{t('body')}</p>

      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {svg && link ? (
          <figure className="shrink-0">
            <div
              role="img"
              aria-label={t('qrAlt')}
              className="size-44 rounded-md border border-border bg-white p-2 [&>svg]:size-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <figcaption className="mt-2">
              <a href={link} className="font-semibold text-primary underline underline-offset-2">
                {t('openOnPhone')}
              </a>
            </figcaption>
          </figure>
        ) : (
          <div className="flex size-44 shrink-0 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border-strong bg-sunken p-3 text-center text-sm text-muted">
            <QrCode aria-hidden className="size-10" />
            {t('notConfigured')}
          </div>
        )}
        <ol className="flex list-decimal flex-col gap-2 pl-5">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
        </ol>
      </div>
      {sandbox && (
        <p className="font-semibold">
          {t('joinText', { join: sandbox.join, number: sandbox.number })}
        </p>
      )}
      <p className="text-sm text-muted">{t('note')}</p>
    </Card>
  );
}
