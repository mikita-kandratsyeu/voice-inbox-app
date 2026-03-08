import { Mic } from 'lucide-react';
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-purple-500 to-pink-500 shadow-lg">
            <Mic className="h-5 w-5 text-white" aria-hidden />
          </div>
          <span className="text-xl font-bold text-black dark:text-white">{t('appName')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
