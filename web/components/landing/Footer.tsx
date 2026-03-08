import { Mic } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n';

export function Footer(): React.ReactElement {
  const t = useTranslations('footer');

  return (
    <footer className="mt-24 border-t border-black/8 dark:border-white/8">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-center justify-between gap-8 md:flex-row">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90"
            aria-label="Voice Inbox"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-pink-500 shadow-lg">
              <Mic className="h-5 w-5 text-white" aria-hidden />
            </div>
            <span className="text-xl font-bold text-black dark:text-white">Voice Inbox</span>
          </Link>
          <div className="flex gap-8">
            <Link
              href="/privacy"
              className="font-medium text-black/70 transition-opacity hover:opacity-100 dark:text-white/70"
            >
              {t('privacyPolicy')}
            </Link>
            <Link
              href="/terms"
              className="font-medium text-black/70 transition-opacity hover:opacity-100 dark:text-white/70"
            >
              {t('termsOfService')}
            </Link>
          </div>
        </div>
        <p className="text-center text-sm text-black/50 dark:text-white/50">
          {t('copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
