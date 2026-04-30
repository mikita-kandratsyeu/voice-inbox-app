import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BackupZipViewer } from '@/components/viewer';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { routing } from '@/lib/i18n';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/viewer`;

  return {
    title: t('viewerTitle'),
    description: t('viewerDescription'),
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function ViewerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'viewerPage' });

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mb-8 text-center sm:mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
              {t('heading')}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {t('intro')}
            </p>
          </div>
          <BackupZipViewer />
        </div>
      </main>
      <Footer />
    </div>
  );
}
