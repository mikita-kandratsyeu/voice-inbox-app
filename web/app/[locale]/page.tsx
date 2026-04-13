import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { CTASection } from '@/components/landing/CTASection';
import { DifferentiationSection } from '@/components/landing/DifferentiationSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { Features } from '@/components/landing/Features';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { MarketingPageShell } from '@/components/landing/MarketingPageShell';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { PrivateModeSection } from '@/components/landing/PrivateModeSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });

  const localePath = locale === 'en' ? '' : `/${locale}`;
  const canonicalUrl = `${BASE_URL_OR_FALLBACK}${localePath}`;

  return {
    title: t('title'),
    description: t('description'),
    robots: { index: true, follow: true },
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale === 'ru' ? 'ru_RU' : 'en_US',
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <MarketingPageShell>
      <Header />
      <main className="flex-1">
        <Hero />
        <DifferentiationSection />
        <PrivateModeSection />
        <HowItWorks />
        <Features />
        <UseCasesSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </MarketingPageShell>
  );
}
