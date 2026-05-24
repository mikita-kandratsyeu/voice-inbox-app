import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { utilitiesShellClass, utilitiesShellDividerClass } from '@/components/ui/utilities-shell';
import { APP_STORE_URL } from '@/config/constants';

export function Header(): React.ReactElement {
  const t = useTranslations('header');

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/75 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-2.5 dark:border-white/12 dark:bg-black/55 dark:shadow-[0_14px_36px_rgba(0,0,0,0.35)]">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90"
          aria-label={t('appName')}
        >
          <Image
            src="/app-icon.svg"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-xl shadow-[0_8px_20px_rgba(59,130,246,0.28)] sm:h-10 sm:w-10"
            priority
          />
          <span className="hidden truncate text-base font-semibold tracking-tight text-black sm:inline dark:text-white">
            {t('appName')}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 min-h-[44px] max-w-[9.5rem] items-center justify-center truncate rounded-xl bg-black px-3.5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_18px_rgba(15,23,42,0.2)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_8px_22px_rgba(15,23,42,0.24)] sm:max-w-none sm:px-4 dark:bg-white dark:text-black"
          >
            <span className="truncate">{t('installApp')}</span>
          </a>

          <div className={utilitiesShellClass} role="group" aria-label={t('preferencesAria')}>
            <LanguageSwitcher variant="grouped" />
            <span className={utilitiesShellDividerClass} aria-hidden />
            <ThemeToggle variant="grouped" />
          </div>
        </div>
      </div>
    </header>
  );
}
