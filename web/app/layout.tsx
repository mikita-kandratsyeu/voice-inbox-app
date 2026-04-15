import type { Metadata } from 'next';
import { Onest } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';

import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { YandexMetrika } from '@/components/analytics/YandexMetrika';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';

import './globals.css';

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL_OR_FALLBACK),
  verification: {
    google: 'DkzhOPpo8WzVKEi9yjlUvpHh1dZhnLzknYyJ486BIaU',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={onest.variable}
      data-scroll-behavior="smooth"
    >
      <body
        className={`${onest.className} min-h-screen bg-white text-black antialiased dark:bg-[#0a0a0a] dark:text-white`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <GoogleAnalytics />
        <YandexMetrika />
      </body>
    </html>
  );
}
