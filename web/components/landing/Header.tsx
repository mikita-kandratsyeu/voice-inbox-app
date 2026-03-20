import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header(): React.ReactElement {
  const t = useTranslations('header');

  return (
    <header className="sticky top-0 z-50 border-b border-black/8 bg-white/70 backdrop-blur-xl dark:border-white/8 dark:bg-black/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex h-16 cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label={t('appName')}
        >
          <Image
            src="/app-icon.svg"
            alt="App Icon"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-lg"
            aria-hidden
          />
          <span className="text-xl font-bold text-black dark:text-white">{t('appName')}</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/releases"
            className="inline-flex h-11 min-h-[44px] items-center rounded-lg border border-black/10 bg-black/5 px-4 text-base font-medium leading-none text-black transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5 dark:text-white"
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
