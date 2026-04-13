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
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-linear-to-b from-[#f8fafc] via-[#f5f7ff] to-[#f7f8fc] text-black transition-colors duration-300 dark:from-[#07080b] dark:via-[#080a11] dark:to-[#07080b] dark:text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_10%_0%,rgba(148,163,184,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(59,130,246,0.12),transparent_45%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.2),transparent_55%),radial-gradient(circle_at_90%_12%,rgba(99,102,241,0.2),transparent_45%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="animate-ambient-drift-slow absolute -left-32 top-10 h-96 w-96 rounded-full bg-blue-500/16 blur-3xl dark:bg-blue-500/20" />
        <div className="animate-ambient-drift-x absolute -right-24 top-28 h-112 w-md rounded-full bg-indigo-500/12 blur-3xl dark:bg-indigo-500/20" />
        <div className="animate-ambient-drift-slow absolute bottom-24 left-1/3 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl dark:bg-sky-500/14" />
        <div className="animate-ambient-drift-x absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-violet-400/8 blur-3xl dark:bg-violet-500/14" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-size-[44px_44px] mask-[radial-gradient(ellipse_at_top,black_22%,transparent_80%)] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_38%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(30,41,59,0.35),transparent_45%)]" />
      </div>
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
    </div>
  );
}
