import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AlertCircle, Crown, ShieldCheck } from 'lucide-react';
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

function InfoState({ title, description }: { title: string; description: string }): ReactNode {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
      <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertCircle className="h-4.5 w-4.5" aria-hidden />
        <p className="text-base font-semibold">{title}</p>
      </div>
      <p className="text-sm leading-relaxed text-black/72 dark:text-white/72">{description}</p>
    </div>
  );
}

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
    body = <InfoState title={t('missingTokenTitle')} description={t('missingTokenBody')} />;
  } else {
    const deviceId = await verifyProAccountPortalToken(token);
    if (!deviceId) {
      body = <InfoState title={t('invalidTokenTitle')} description={t('invalidTokenBody')} />;
    } else {
      const active = await isProDevice(deviceId);
      if (!active) {
        body = <InfoState title={t('notActiveTitle')} description={t('notActiveBody')} />;
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
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium tracking-wide text-blue-700 dark:border-blue-400/25 dark:bg-blue-500/14 dark:text-blue-300">
                <Crown className="h-3.5 w-3.5" aria-hidden />
                {t('planLabel')}
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-white">
                {t('title')}
              </h1>
              <p className="text-sm text-black/62 dark:text-white/62">{t('footerNote')}</p>
            </div>

            <dl className="space-y-4 rounded-3xl border border-black/10 bg-white/75 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/12 dark:bg-white/6 dark:shadow-[0_14px_36px_rgba(0,0,0,0.32)]">
              <div>
                <dt className="text-sm font-medium text-black/55 dark:text-white/55">
                  {t('activationType')}
                </dt>
                <dd className="mt-1 text-base text-black dark:text-white">
                  {kind === 'license' ? t('typeLicense') : t('typeStore')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-black/55 dark:text-white/55">
                  {t('status')}
                </dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                    {t('statusActive')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-black/55 dark:text-white/55">
                  {isLifetime ? t('validThrough') : t('renewsOrExpires')}
                </dt>
                <dd className="mt-1 text-base text-black dark:text-white">
                  {isLifetime ? t('lifetimeValue') : (dateLabel ?? '—')}
                </dd>
              </div>
            </dl>
          </div>
        );
      }
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#f8fafc] text-black dark:bg-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
          <div className="rounded-4xl border border-black/10 bg-white/85 p-7 shadow-[0_16px_44px_rgba(15,23,42,0.1)] backdrop-blur-sm dark:border-white/12 dark:bg-white/6 dark:shadow-[0_22px_56px_rgba(0,0,0,0.35)] sm:p-10">
            {body}
            <Link
              href="/"
              className="mt-9 inline-flex min-h-[44px] items-center rounded-xl border border-black/12 bg-black/4 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-black/8 dark:border-white/15 dark:bg-white/6 dark:text-white dark:hover:bg-white/10"
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
