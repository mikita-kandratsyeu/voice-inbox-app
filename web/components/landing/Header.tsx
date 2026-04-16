import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { APP_STORE_URL } from '@/config/constants';

export function Header(): React.ReactElement {
  const t = useTranslations('header');

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2.5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:gap-3 sm:px-5 sm:py-3 dark:border-white/12 dark:bg-black/60 dark:shadow-[0_14px_36px_rgba(0,0,0,0.35)]">
        <Link
          href="/"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label={t('appName')}
        >
          <Image
            src="/app-icon.svg"
            alt="App Icon"
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl shadow-[0_10px_24px_rgba(59,130,246,0.3)]"
            priority
            aria-hidden
          />
          <span className="min-w-0 truncate text-lg font-semibold tracking-tight text-black dark:text-white">
            {t('appName')}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <a
            href={APP_STORE_URL}
            className="hidden h-11 min-h-[44px] items-center rounded-xl bg-black px-4 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_6px_20px_rgba(15,23,42,0.18)] transition-[transform,box-shadow,opacity] hover:-translate-y-px hover:opacity-95 hover:shadow-[0_1px_0_rgba(255,255,255,0.14)_inset,0_8px_24px_rgba(15,23,42,0.22)] dark:bg-white dark:text-black dark:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_6px_22px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_8px_28px_rgba(0,0,0,0.4)] sm:inline-flex"
          >
            {t('installApp')}
          </a>
          <div className="flex h-11 items-stretch rounded-2xl border border-black/8 bg-black/[0.035] p-1 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset] dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <Link
              href="/blog"
              className="hidden items-center rounded-lg px-3.5 text-sm font-medium text-black/78 transition-colors hover:bg-black/[0.07] dark:text-white/82 dark:hover:bg-white/8 sm:inline-flex"
            >
              {t('releases')}
            </Link>
            <span
              className="hidden w-px shrink-0 self-stretch bg-black/10 my-1.5 dark:bg-white/12 sm:block"
              aria-hidden
            />
            <LanguageSwitcher variant="grouped" />
            <span
              className="w-px shrink-0 self-stretch bg-black/10 my-1.5 dark:bg-white/12"
              aria-hidden
            />
            <ThemeToggle variant="grouped" />
          </div>
        </div>
      </div>
    </header>
  );
}
