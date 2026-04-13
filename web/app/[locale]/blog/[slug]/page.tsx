import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { MarketingPageShell } from '@/components/landing/MarketingPageShell';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { getPublishedRelease, listPublishedSlugsForLocale } from '@/lib/releases';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export const revalidate = 60;

const articleShellClass =
  'rounded-4xl border border-black/10 bg-white/85 p-7 shadow-[0_16px_44px_rgba(15,23,42,0.1)] backdrop-blur-sm dark:border-white/12 dark:bg-white/6 dark:shadow-[0_22px_56px_rgba(0,0,0,0.35)] sm:p-10';

const secondaryLinkClass =
  'inline-flex min-h-[44px] items-center rounded-xl border border-black/12 bg-black/4 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black/8 dark:border-white/15 dark:bg-white/6 dark:text-white dark:hover:bg-white/10';

const breadcrumbClass =
  'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-black/55 transition-colors hover:text-black dark:text-white/55 dark:hover:text-white';

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
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/blog/${slug}`;
  const desc = post.summary?.slice(0, 160) ?? t('releasesListDescription');

  return {
    title: `${post.title} — ${t('releasesListTitle')}`,
    description: desc,
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'releases' });
  const post = await getPublishedRelease(locale, slug);

  if (!post) {
    notFound();
  }

  const date = post.publishedAt ?? post.createdAt;

  return (
    <MarketingPageShell>
      <Header />
      <main className="flex-1">
        <article className="px-4 py-15 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <nav className="mb-6" aria-label="Breadcrumb">
              <Link href="/blog" className={breadcrumbClass}>
                <span aria-hidden className="text-black/40 dark:text-white/40">
                  ←
                </span>
                {t('allPosts')}
              </Link>
            </nav>

            <div className={articleShellClass}>
              <h1 className="text-balance text-3xl font-semibold tracking-tight text-black sm:text-4xl dark:text-white">
                {post.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-black/50 dark:text-white/50">
                {date ? (
                  <time dateTime={date.toISOString()}>
                    {date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                ) : null}
                {date && post.version ? (
                  <span className="hidden text-black/30 sm:inline dark:text-white/30" aria-hidden>
                    ·
                  </span>
                ) : null}
                {post.version ? (
                  <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
                    {t('version')} {post.version}
                  </span>
                ) : null}
              </div>

              {post.summary ? (
                <p className="mt-6 border-l-2 border-blue-500/35 pl-4 text-base leading-relaxed text-black/70 dark:border-blue-400/40 dark:text-white/70">
                  {post.summary}
                </p>
              ) : null}

              <div className="mt-8 border-t border-black/8 pt-8 dark:border-white/10">
                <MarkdownContent
                  content={post.body}
                  variant="blog"
                  className="mx-auto max-w-2xl"
                />
              </div>

              <div className="mt-12 flex flex-wrap gap-3 border-t border-black/8 pt-8 sm:gap-4 dark:border-white/10">
                <Link href="/blog" className={secondaryLinkClass}>
                  {t('backToList')}
                </Link>
                <Link href="/" className={secondaryLinkClass}>
                  {t('backHome')}
                </Link>
              </div>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </MarketingPageShell>
  );
}
