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
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
            {t('pageTitle')}
          </h1>
          <p className="mt-2 text-base text-black/65 sm:text-lg dark:text-white/65">
            {t('pageSubtitle')}
          </p>

          {posts.length === 0 ? (
            <p className="mt-12 rounded-2xl border border-black/10 bg-white/80 p-8 text-center text-black/60 dark:border-white/12 dark:bg-white/5 dark:text-white/60">
              {t('empty')}
            </p>
          ) : (
            <ul className="mt-10 space-y-3 sm:space-y-4">
              {posts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/releases/${p.slug}`}
                    className="group block rounded-2xl border border-black/10 bg-white/85 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-[0_12px_34px_rgba(15,23,42,0.1)] dark:border-white/12 dark:bg-white/5 dark:hover:bg-white/7 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="text-xl font-semibold tracking-tight text-black dark:text-white">
                        {p.title}
                      </span>
                      {p.version && (
                        <span className="rounded-full border border-black/8 bg-black/3 px-2.5 py-0.5 text-xs font-medium text-black/70 dark:border-white/12 dark:bg-white/10 dark:text-white/80">
                          {t('version')} {p.version}
                        </span>
                      )}
                    </div>
                    {p.summary && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-black/70 dark:text-white/70">
                        {p.summary}
                      </p>
                    )}
                    <p className="mt-3 text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-500 dark:text-blue-400">
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
            className="mt-10 inline-flex rounded-lg px-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
          >
            {t('backHome')}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
