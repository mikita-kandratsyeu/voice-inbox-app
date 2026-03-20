import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header(): React.ReactElement {
  const t = useTranslations('header');

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white/70 backdrop-blur-xl dark:border-white/8 dark:bg-black/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
        <Link
          href="/"
          className="flex shrink-0 cursor-pointer items-center gap-2 transition-opacity hover:opacity-90 sm:min-w-0 sm:flex-1 sm:gap-2.5"
          aria-label={t('appName')}
        >
          <Image
            src="/app-icon.svg"
            alt="App Icon"
            width={36}
            height={36}
            className="h-8 w-8 shrink-0 rounded-xl shadow-lg sm:h-9 sm:w-9"
            aria-hidden
          />
          <span className="hidden min-w-0 truncate text-base font-bold text-black sm:block sm:text-xl dark:text-white">
            {t('appName')}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <Link
            href="/releases"
            className="inline-flex h-11 min-h-[44px] shrink-0 items-center rounded-lg border border-black/10 bg-black/5 px-2.5 text-sm font-medium leading-none text-black transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5 dark:text-white sm:px-4 sm:text-base"
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
