import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { HttpErrorScreen } from '@/components/errors/HttpErrorScreen';
import { BASE_URL_OR_FALLBACK } from '@/config/constants';
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
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}/400`;

  return {
    title: t('error400Title'),
    description: t('error400Description'),
    robots: { index: false, follow: true },
    alternates: { canonical: canonicalUrl },
  };
}

export default async function BadRequestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('httpErrors');

  return (
    <HttpErrorScreen
      code="400"
      badge={t('400.badge')}
      title={t('400.title')}
      description={t('400.description')}
      homeLabel={t('backHome')}
    />
  );
}
