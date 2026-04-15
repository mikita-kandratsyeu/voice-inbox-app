import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BASE_URL_OR_FALLBACK, SUPPORT_EMAIL } from '@/config/constants';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Link } from '@/lib/i18n';
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
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/support`;

  return {
    title: t('supportTitle'),
    description: t('supportDescription'),
    robots: { index: true, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function SupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'supportPage' });
  const mail = SUPPORT_EMAIL.trim();
  const mailHref = mail.length > 0 ? `mailto:${mail}` : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-white/85 p-8 shadow-[0_10px_36px_rgba(15,23,42,0.08)] dark:border-white/12 dark:bg-white/5 dark:shadow-[0_14px_44px_rgba(0,0,0,0.34)] sm:p-12">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('heading')}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
              {t('body')}
            </p>
            {mailHref ? (
              <p className="mt-6 text-base">
                <span className="font-semibold text-slate-900 dark:text-white">
                  {t('emailLabel')}
                </span>{' '}
                <a
                  href={mailHref}
                  className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-500 dark:text-blue-400"
                >
                  {mail}
                </a>
              </p>
            ) : (
              <p className="mt-6 text-base text-amber-800 dark:text-amber-200">
                {t('emailMissing')}
              </p>
            )}
            <ul className="mt-8 list-disc space-y-2 pl-5 text-base text-slate-700 dark:text-slate-300">
              <li>{t('bulletApp')}</li>
              <li>{t('bulletPrivacy')}</li>
            </ul>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/privacy"
                className="inline-flex rounded-lg text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
              >
                {t('linkPrivacy')}
              </Link>
              <Link
                href="/terms"
                className="inline-flex rounded-lg text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
              >
                {t('linkTerms')}
              </Link>
            </div>
            <Link
              href="/"
              className="mt-10 inline-flex rounded-lg px-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400"
            >
              {t('backHome')}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
