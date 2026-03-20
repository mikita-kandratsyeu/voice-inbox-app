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
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative flex-1">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(37,99,235,0.15)_0%,transparent_50%)]" />
        </div>
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/8 bg-white/80 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:p-12">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {post.version && (
                <span className="rounded-full bg-black/5 px-3 py-1 text-sm font-medium text-black/80 dark:bg-white/10 dark:text-white/85">
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
            <h1 className="mb-8 text-3xl font-black tracking-tight text-black dark:text-white sm:text-4xl">
              {post.title}
            </h1>
            <MarkdownContent content={post.body} />
            <div className="mt-10 flex flex-wrap gap-6">
              <Link
                href="/releases"
                className="font-medium text-blue-500 underline hover:opacity-90 hover:underline-offset-4"
              >
                {t('backToList')}
              </Link>
              <Link
                href="/"
                className="font-medium text-blue-500 underline hover:opacity-90 hover:underline-offset-4"
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
