import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { MarketingPageShell } from '@/components/landing/MarketingPageShell';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { listPublishedReleases } from '@/lib/releases';

type Props = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 60;

const postCardClass =
  'group block rounded-2xl border border-black/10 bg-white/85 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:hover:border-blue-400/35 dark:hover:bg-white/7 dark:hover:shadow-[0_16px_38px_rgba(0,0,0,0.36)] sm:p-6';

const secondaryLinkClass =
  'inline-flex min-h-[44px] items-center rounded-xl border border-black/12 bg-black/4 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black/8 dark:border-white/15 dark:bg-white/6 dark:text-white dark:hover:bg-white/10';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/blog`;

  return {
    title: t('releasesListTitle'),
    description: t('releasesListDescription'),
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'releases' });
  const posts = await listPublishedReleases(locale);

  return (
    <MarketingPageShell>
      <Header />
      <main className="flex-1">
        <section className="px-4 py-15 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center sm:mb-12">
              <h1 className="mb-3 text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
                {t('pageTitle')}
              </h1>
              <p className="mx-auto max-w-2xl text-base text-black/60 sm:text-lg dark:text-white/60">
                {t('pageSubtitle')}
              </p>
            </div>

            {posts.length === 0 ? (
              <p className="rounded-2xl border border-black/10 bg-white/85 p-8 text-center text-base text-black/60 shadow-[0_8px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/12 dark:bg-white/5 dark:text-white/60">
                {t('empty')}
              </p>
            ) : (
              <ul className="space-y-3 sm:space-y-4">
                {posts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`} className={postCardClass}>
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

            <div className="mt-10 flex justify-center sm:justify-start">
              <Link href="/" className={secondaryLinkClass}>
                {t('backHome')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </MarketingPageShell>
  );
}
