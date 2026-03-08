import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n';
import { routing } from '@/lib/i18n';
import { Header } from '@/components/landing/Header';

type Props = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('footer');

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex max-w-6xl flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div>
          <h1 className="mb-6 text-3xl font-bold text-black dark:text-white">
            {t('privacyPolicy')}
          </h1>
          <p className="text-black/70 dark:text-white/70">
            Privacy policy content will be added here.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-purple-500 underline transition-opacity hover:opacity-90"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
