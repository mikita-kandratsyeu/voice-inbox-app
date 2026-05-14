import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import {
  ProAccountAlert,
  ProAccountCard,
  ProAccountMain,
  ProAccountPageRoot,
  ProAccountSuccess,
  type AccountProSuccessCopy,
} from '@/components/account-pro/AccountProViews';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { routing } from '@/lib/i18n';
import { verifyProAccountPortalToken } from '@/lib/pro-account-portal';
import {
  getProActivationKind,
  getProExpiresAtUtc,
  isProDevice,
  type ProActivationKind,
} from '@/lib/pro-entitlement';

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

  const successCopy: AccountProSuccessCopy = {
    planLabel: t('planLabel'),
    title: t('title'),
    activationType: t('activationType'),
    typeLicense: t('typeLicense'),
    typeStore: t('typeStore'),
    status: t('status'),
    statusActive: t('statusActive'),
    renewsOrExpires: t('renewsOrExpires'),
    validThrough: t('validThrough'),
    lifetimeValue: t('lifetimeValue'),
    footerNote: t('footerNote'),
  };

  const { t: rawT } = await searchParams;
  const token = typeof rawT === 'string' ? rawT.trim() : '';

  let body: ReactNode;

  if (!token) {
    body = (
      <ProAccountAlert
        tone="neutral"
        title={t('missingTokenTitle')}
        description={t('missingTokenBody')}
      />
    );
  } else {
    const deviceId = await verifyProAccountPortalToken(token);
    if (!deviceId) {
      body = (
        <ProAccountAlert
          tone="danger"
          title={t('invalidTokenTitle')}
          description={t('invalidTokenBody')}
        />
      );
    } else {
      const active = await isProDevice(deviceId);
      if (!active) {
        body = (
          <ProAccountAlert
            tone="warning"
            title={t('notActiveTitle')}
            description={t('notActiveBody')}
          />
        );
      } else {
        const kindRaw = await getProActivationKind(deviceId);
        const kind: ProActivationKind = kindRaw ?? 'store';
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
          <ProAccountSuccess
            copy={successCopy}
            kind={kind}
            isLifetime={isLifetime}
            dateLabel={dateLabel}
          />
        );
      }
    }
  }

  return (
    <ProAccountPageRoot>
      <Header />
      <ProAccountMain>
        <ProAccountCard>{body}</ProAccountCard>
      </ProAccountMain>
      <Footer />
    </ProAccountPageRoot>
  );
}
