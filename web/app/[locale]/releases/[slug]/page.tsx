import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { getPublishedRelease, listPublishedSlugsForLocale } from '@/lib/releases';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 60;

export async function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of routing.locales) {
    const slugs = await listPublishedSlugsForLocale(locale);
    for (const slug of slugs) out.push({ locale, slug });
  }
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPublishedRelease(locale, slug);
  if (!post) {
    return { title: 'Not found' };
  }
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/releases/${slug}`;
  const desc = post.summary?.slice(0, 160) ?? t('releasesListDescription');

  return {
    title: `${post.title} — ${t('releasesListTitle')}`,
    description: desc,
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function ReleaseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'releases' });
  const post = await getPublishedRelease(locale, slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_10px_36px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_44px_rgba(0,0,0,0.34)] sm:p-12">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {post.version && (
                <span className="rounded-full border border-black/8 bg-black/3 px-3 py-1 text-xs font-medium text-black/80 dark:border-white/12 dark:bg-white/10 dark:text-white/85">
                  {t('version')} {post.version}
                </span>
              )}
              {(post.publishedAt ?? post.createdAt) && (
                <time
                  dateTime={(post.publishedAt ?? post.createdAt).toISOString()}
                  className="text-sm text-black/50 dark:text-white/50"
                >
                  {(post.publishedAt ?? post.createdAt).toLocaleDateString(
                    locale === 'ru' ? 'ru-RU' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric' },
                  )}
                </time>
              )}
            </div>
            <h1 className="mb-8 text-3xl font-semibold tracking-tight text-black dark:text-white sm:text-4xl">
              {post.title}
            </h1>
            <MarkdownContent content={post.body} />
            <div className="mt-10 flex flex-wrap gap-4 sm:gap-6">
              <Link
                href="/releases"
                className="inline-flex rounded-lg px-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
              >
                {t('backToList')}
              </Link>
              <Link
                href="/"
                className="inline-flex rounded-lg px-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
              >
                {t('backHome')}
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
