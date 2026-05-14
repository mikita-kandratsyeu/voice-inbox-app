import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import {
  AccountProDevPreview,
  parseAccountProPreviewOptions,
} from '@/lib/account-pro-preview-document';
import { routing } from '@/lib/i18n';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Dev preview — account/pro',
  robots: { index: false, follow: false },
};

/**
 * Local QA for `/account/pro` UI. Not available in production.
 * The old `/api/dev/account-pro-preview` URL 307-redirects here (dev only).
 *
 * Examples (default locale prefix `as-needed`: English has no `/en` prefix):
 * - http://localhost:3000/dev/account-pro-preview
 * - http://localhost:3000/ru/dev/account-pro-preview?state=missing
 * - http://localhost:3000/dev/account-pro-preview?state=success&kind=license&lifetime=1
 * - http://localhost:3000/dev/account-pro-preview?state=success&kind=store&expires=2027-01-20T00:00:00.000Z&theme=dark
 */
export default async function DevAccountProPreviewPage({ params, searchParams }: Props) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const { locale } = await params;
  setRequestLocale(locale);

  const opts = parseAccountProPreviewOptions(await searchParams, locale);

  return (
    <div className={opts.theme === 'dark' ? 'dark min-h-screen' : 'min-h-screen'}>
      <AccountProDevPreview {...opts} />
    </div>
  );
}
