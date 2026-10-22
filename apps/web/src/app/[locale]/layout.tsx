import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  Inter,
  JetBrains_Mono,
  Noto_Sans_Devanagari,
  Noto_Sans_SC,
  Noto_Sans_Tamil,
  Plus_Jakarta_Sans,
  Source_Serif_4,
} from 'next/font/google';
import { routing } from '@/i18n/routing';
import { Providers } from '../providers';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-jakarta',
});
const notoDeva = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-deva',
});
const notoTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-tamil',
});
const notoSc = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sc',
});
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
});
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'Kavach',
  description: 'The AI that stands beside your family at every insurance moment.',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const fonts = [inter, jakarta, notoDeva, notoTamil, notoSc, sourceSerif, jetbrains].map(
    (f) => f.variable,
  );

  return (
    // public/theme.js sets data-theme before React loads, so React must not warn about it.
    <html lang={locale} className={fonts.join(' ')} suppressHydrationWarning>
      <head>
        {/* Async so React can hoist it; it is tiny and runs before the page has painted. The
            opening (components/kavach/boot.tsx) repeats its decision, so a late run cannot hide it. */}
        <script async src="/theme.js" />
        {/* Material Symbols Outlined, the Stitch icon set (components/kavach/icon.tsx). A variable
            icon font is not offered by next/font, so it loads as a stylesheet; `block` keeps the
            ligature names from flashing as words while it arrives. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display -- an icon font: `block` hides ligature names, there is no text to swap */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,0&display=block"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
