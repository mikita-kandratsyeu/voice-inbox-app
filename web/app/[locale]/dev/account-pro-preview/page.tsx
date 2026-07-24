import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { AccountProDevPreview } from '@/lib/account-pro-preview-document';
import { isProductionLikeAppEnv } from '@/lib/app-env';
import { parseAccountProPreviewOptions } from '@/lib/account-pro-preview-fixtures';
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
 * Prefer `/api/dev/account-pro-preview` for raw HTML (same query params).
 *
 * Examples:
 * - http://localhost:3000/api/dev/account-pro-preview?list=1
 * - http://localhost:3000/dev/account-pro-preview?variant=voucher-success
 * - http://localhost:3000/ru/dev/account-pro-preview?variant=voucher-success&theme=dark
 * - http://localhost:3000/dev/account-pro-preview?state=success&kind=license&lifetime=1
 */
export default async function DevAccountProPreviewPage({ params, searchParams }: Props) {
  if (isProductionLikeAppEnv()) {
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
