import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { verifyProAccountPortalToken } from '@/lib/pro-account-portal';
import { getProActivationKind, getProExpiresAtUtc, isProDevice } from '@/lib/pro-entitlement';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const LIFETIME_CUTOFF_YEAR = 2090;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/account/pro`;

  return {
    title: t('accountProTitle'),
    description: t('accountProDescription'),
    robots: { index: false, follow: false },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function ProAccountPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'accountPro' });

  const { t: rawT } = await searchParams;
  const token = typeof rawT === 'string' ? rawT.trim() : '';

  let body: ReactNode;

  if (!token) {
    body = (
      <div className="space-y-3">
        <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {t('missingTokenTitle')}
        </p>
        <p className="text-neutral-600 dark:text-neutral-400">{t('missingTokenBody')}</p>
      </div>
    );
  } else {
    const deviceId = await verifyProAccountPortalToken(token);
    if (!deviceId) {
      body = (
        <div className="space-y-3">
          <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {t('invalidTokenTitle')}
          </p>
          <p className="text-neutral-600 dark:text-neutral-400">{t('invalidTokenBody')}</p>
        </div>
      );
    } else {
      const active = await isProDevice(deviceId);
      if (!active) {
        body = (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('notActiveTitle')}
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">{t('notActiveBody')}</p>
          </div>
        );
      } else {
        const kind = await getProActivationKind(deviceId);
        const expiresAt = await getProExpiresAtUtc(deviceId);
        const isLifetime =
          expiresAt != null &&
          Number.isFinite(expiresAt.getTime()) &&
          expiresAt.getUTCFullYear() >= LIFETIME_CUTOFF_YEAR;

        const dateLabel =
          expiresAt != null && Number.isFinite(expiresAt.getTime())
            ? new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
              }).format(expiresAt)
            : null;

        body = (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {t('planLabel')}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
                {t('title')}
              </h1>
            </div>

            <dl className="space-y-4 rounded-2xl border border-black/8 bg-white/60 p-6 dark:border-white/10 dark:bg-white/5">
              <div>
                <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {t('activationType')}
                </dt>
                <dd className="mt-1 text-base text-neutral-900 dark:text-neutral-100">
                  {kind === 'license' ? t('typeLicense') : t('typeStore')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {t('status')}
                </dt>
                <dd className="mt-1 text-base text-neutral-900 dark:text-neutral-100">
                  {t('statusActive')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {isLifetime ? t('validThrough') : t('renewsOrExpires')}
                </dt>
                <dd className="mt-1 text-base text-neutral-900 dark:text-neutral-100">
                  {isLifetime ? t('lifetimeValue') : (dateLabel ?? '—')}
                </dd>
              </div>
            </dl>

            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
              {t('footerNote')}
            </p>
          </div>
        );
      }
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="relative flex-1">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(37,99,235,0.15)_0%,transparent_50%)]" />
        </div>
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-black/8 bg-white/80 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:p-10">
            {body}
            <Link
              href="/"
              className="mt-10 inline-block font-medium text-blue-500 underline hover:opacity-90 hover:underline-offset-4"
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
