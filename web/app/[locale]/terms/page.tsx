import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { AnimateOnScroll } from '@/components/ui/AnimateOnScroll';
import { Footer } from '@/components/landing/Footer';
import { Header } from '@/components/landing/Header';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('footer');

  return (
    <div className="flex min-h-screen flex-col transition-colors duration-300">
      <Header />
      <main className="relative flex-1">
        <div
          className="absolute inset-0 -z-10 animate-gradient-pulse bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.2)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(37,99,235,0.15)_0%,transparent_50%)] opacity-100"
          aria-hidden
        />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <AnimateOnScroll>
            <div className="rounded-3xl border border-black/8 bg-white/80 p-8 shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] sm:p-12">
              <h1 className="mb-6 text-4xl font-black text-black dark:text-white sm:text-5xl">
                {t('termsOfService')}
              </h1>
              <p className="text-lg leading-relaxed text-black/70 dark:text-white/70">
                Terms of service content will be added here.
              </p>
              <Link
                href="/"
                className="mt-8 inline-block font-medium text-blue-500 underline transition-all duration-200 hover:opacity-90 hover:underline-offset-4"
              >
                ← Back to home
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </main>
      <Footer />
    </div>
  );
}
