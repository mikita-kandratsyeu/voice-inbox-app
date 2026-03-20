import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { listPublishedReleases } from '@/lib/releases';

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 60;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/releases`;

  return {
    title: t('releasesListTitle'),
    description: t('releasesListDescription'),
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function ReleasesIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'releases' });
  const posts = await listPublishedReleases(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative flex-1">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(37,99,235,0.15)_0%,transparent_50%)]" />
        </div>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-black tracking-tight text-black dark:text-white sm:text-4xl">
            {t('pageTitle')}
          </h1>
          <p className="mt-2 text-lg text-black/70 dark:text-white/70">{t('pageSubtitle')}</p>

          {posts.length === 0 ? (
            <p className="mt-12 text-center text-black/60 dark:text-white/60">{t('empty')}</p>
          ) : (
            <ul className="mt-12 space-y-4">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/releases/${p.slug}`}
                    className="block rounded-2xl border border-black/8 bg-white/80 p-6 shadow-sm transition-colors hover:border-blue-500/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xl font-bold text-black dark:text-white">
                        {p.title}
                      </span>
                      {p.version && (
                        <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-sm font-medium text-black/70 dark:bg-white/10 dark:text-white/80">
                          {t('version')} {p.version}
                        </span>
                      )}
                    </div>
                    {p.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-black/70 dark:text-white/70">
                        {p.summary}
                      </p>
                    )}
                    <p className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400">
                      {t('readMore')} →
                    </p>
                    {(p.publishedAt ?? p.createdAt) && (
                      <p className="mt-2 text-xs text-black/45 dark:text-white/45">
                        {(p.publishedAt ?? p.createdAt).toLocaleDateString(
                          locale === 'ru' ? 'ru-RU' : 'en-US',
                          { year: 'numeric', month: 'long', day: 'numeric' },
                        )}
                      </p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/"
            className="mt-12 inline-block font-medium text-blue-500 underline hover:opacity-90 hover:underline-offset-4"
          >
            {t('backHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
