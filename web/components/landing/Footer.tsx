import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { VERIFIED_METRICS_URL } from '@/config/constants';
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
            aria-label="Voice Inbox AI"
          >
            <Image
              src="/app-icon.svg"
              alt="App Icon"
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl shadow-lg"
              aria-hidden
            />
            <span className="text-xl font-bold text-black dark:text-white">Voice Inbox AI</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            <Link
              href="/releases"
              className="font-medium text-black/70 transition-opacity hover:opacity-100 dark:text-white/70"
            >
              {t('releases')}
            </Link>
            {VERIFIED_METRICS_URL ? (
              <a
                href={VERIFIED_METRICS_URL}
                className="font-medium text-black/70 transition-opacity hover:opacity-100 dark:text-white/70"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('verifiedMetrics')}
              </a>
            ) : null}
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
