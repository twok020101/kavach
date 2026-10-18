import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'hi', 'ta', 'zh', 'ms'],
  defaultLocale: 'en',
});
