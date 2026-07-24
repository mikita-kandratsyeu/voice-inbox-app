import type { Metadata } from 'next';
import { Newspaper, Sparkles } from 'lucide-react';
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
  'group block rounded-2xl border border-black/10 bg-white/85 p-5 shadow-[0_8px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/30 hover:shadow-[0_14px_34px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f5f7ff] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] dark:hover:border-blue-400/35 dark:hover:bg-white/7 dark:hover:shadow-[0_16px_38px_rgba(0,0,0,0.36)] dark:focus-visible:ring-blue-400/50 dark:focus-visible:ring-offset-[#07080b] sm:p-6';

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

function formatPostDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function BlogIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'releases' });
  const posts = await listPublishedReleases(locale);
  const feedUrl = `${BASE_URL_OR_FALLBACK}/${locale}/blog/feed.xml`;

  return (
    <MarketingPageShell>
      <Header />
      <main className="flex-1">
        <section className="px-4 py-15 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center sm:mb-12">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {t('sectionEyebrow')}
              </div>
              <h1 className="mb-3 text-balance text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
                {t('pageTitle')}
              </h1>
              <p className="mx-auto max-w-2xl text-pretty text-base text-black/60 sm:text-lg dark:text-white/60">
                {t('pageSubtitle')}
              </p>
              <p className="mt-4">
                <a
                  href={feedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-500 dark:text-blue-400"
                >
                  {t('rssFeed')}
                </a>
              </p>
            </div>

            {posts.length === 0 ? (
              <div className="rounded-2xl border border-black/10 bg-white/85 px-6 py-12 text-center shadow-[0_8px_26px_rgba(15,23,42,0.05)] backdrop-blur-sm dark:border-white/12 dark:bg-white/5 sm:px-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/8 bg-black/4 dark:border-white/12 dark:bg-white/8">
                  <Newspaper
                    className="h-7 w-7 text-black/35 dark:text-white/40"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </div>
                <p className="text-base text-black/65 dark:text-white/65">{t('empty')}</p>
                <div className="mt-8 flex justify-center">
                  <Link href="/" className={secondaryLinkClass}>
                    {t('backHome')}
                  </Link>
                </div>
              </div>
            ) : (
              <ul className="space-y-3 sm:space-y-4">
                {posts.map((p) => {
                  const date = p.publishedAt ?? p.createdAt;
                  return (
                    <li key={p.slug}>
                      <Link href={`/blog/${p.slug}`} className={postCardClass}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {date ? (
                            <time
                              dateTime={date.toISOString()}
                              className="text-xs font-medium tracking-wide text-black/45 uppercase dark:text-white/45"
                            >
                              {formatPostDate(date, locale)}
                            </time>
                          ) : (
                            <span />
                          )}
                          {p.version ? (
                            <span className="rounded-full border border-blue-500/18 bg-blue-500/8 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/12 dark:text-blue-300">
                              {t('version')} {p.version}
                            </span>
                          ) : null}
                        </div>
                        <h2 className="mt-3 text-balance text-xl font-semibold tracking-tight text-black sm:text-[1.35rem] dark:text-white">
                          {p.title}
                        </h2>
                        {p.summary ? (
                          <p className="mt-2 line-clamp-3 text-base leading-relaxed text-black/68 dark:text-white/68">
                            {p.summary}
                          </p>
                        ) : null}
                        <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors group-hover:gap-2 dark:text-blue-400">
                          {t('readMore')}
                          <span
                            aria-hidden
                            className="transition-transform group-hover:translate-x-0.5"
                          >
                            →
                          </span>
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {posts.length > 0 ? (
              <div className="mt-10 flex justify-center sm:justify-start">
                <Link href="/" className={secondaryLinkClass}>
                  {t('backHome')}
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer />
    </MarketingPageShell>
  );
}
