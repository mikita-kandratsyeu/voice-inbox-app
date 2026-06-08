import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { VERIFIED_METRICS_URL } from '@/config/constants';
import { marketingContentClass, marketingGutterClass } from '@/components/landing/marketing-layout';
import { Link } from '@/lib/i18n';

export function Footer(): React.ReactElement {
  const t = useTranslations('footer');

  return (
    <footer className="mt-16 border-t border-black/8 bg-white/60 dark:border-white/8 dark:bg-white/3">
      <div className={`${marketingGutterClass} py-12 sm:py-14`}>
        <div className={marketingContentClass}>
          <div className="mb-6 flex flex-col items-center justify-between gap-6 md:flex-row">
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
                className="h-10 w-10 rounded-xl shadow-[0_10px_24px_rgba(59,130,246,0.3)]"
                aria-hidden
              />
              <span className="text-lg font-semibold tracking-tight text-black dark:text-white">
                Voice Inbox AI
              </span>
            </Link>
            <div className="flex flex-wrap justify-center gap-5 text-sm sm:gap-7">
              <Link
                href="/blog"
                className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/65 dark:hover:text-white"
              >
                {t('releases')}
              </Link>
              <Link
                href="/viewer"
                className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/65 dark:hover:text-white"
              >
                {t('backupViewer')}
              </Link>
              {VERIFIED_METRICS_URL ? (
                <a
                  href={VERIFIED_METRICS_URL}
                  className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/65 dark:hover:text-white"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('verifiedMetrics')}
                </a>
              ) : null}
              <Link
                href="/support"
                className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/65 dark:hover:text-white"
              >
                {t('support')}
              </Link>
              <Link
                href="/privacy"
                className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/65 dark:hover:text-white"
              >
                {t('privacyPolicy')}
              </Link>
              <Link
                href="/terms"
                className="font-medium text-black/65 transition-colors hover:text-black dark:text-white/65 dark:hover:text-white"
              >
                {t('termsOfService')}
              </Link>
            </div>
          </div>
          <p className="text-center text-xs text-black/50 sm:text-sm dark:text-white/50">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
