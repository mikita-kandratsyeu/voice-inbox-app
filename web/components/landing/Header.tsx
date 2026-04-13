import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <a
            href="#download"
            className="hidden h-11 min-h-[44px] items-center rounded-lg bg-black px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-black sm:inline-flex"
          >
            {t('installApp')}
          </a>
          <Link
            href="/releases"
            className="hidden h-11 min-h-[44px] shrink-0 items-center rounded-lg border border-black/10 bg-black/5 px-3 text-sm font-medium leading-none text-black transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5 dark:text-white sm:inline-flex sm:px-4"
          >
            {t('releases')}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
