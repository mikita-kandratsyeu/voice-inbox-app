'use client';

import { ChevronDown } from 'lucide-react';
import { useParams } from 'next/navigation';
import { startTransition, useEffect, useRef, useState } from 'react';

import { usePathname, useRouter } from '@/lib/i18n';
import { routing } from '@/lib/i18n';

const LOCALES = [
  { code: 'en' as const, label: 'English' },
  { code: 'ru' as const, label: 'Русский' },
] as const;

export function LanguageSwitcher(): React.ReactElement {
  const params = useParams();
  const localeParam = params?.locale as string | undefined;
  const locale = routing.locales.includes(localeParam as 'en' | 'ru')
    ? (localeParam as 'en' | 'ru')
    : routing.defaultLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (newLocale: 'en' | 'ru'): void => {
    if (newLocale === locale) return;
    setIsOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  const currentLabel = LOCALES.find((l) => l.code === locale)?.label ?? locale.toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
        className="flex h-11 min-h-[44px] min-w-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-black/10 bg-black/5 px-2.5 text-sm font-medium leading-none text-black transition-opacity hover:opacity-90 dark:border-white/10 dark:bg-white/5 dark:text-white sm:max-w-none sm:gap-1.5 sm:px-4 sm:text-base"
      >
        <span className="sm:hidden">{locale.toUpperCase()}</span>
        <span className="hidden min-w-0 truncate sm:inline">{currentLabel}</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" aria-hidden />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-gray-900"
        >
          {LOCALES.map(({ code, label }) => (
            <li key={code} role="option" aria-selected={code === locale}>
              <button
                type="button"
                onClick={() => handleSelect(code)}
                className={`block w-full px-4 py-2.5 text-left text-sm font-medium text-black transition-colors hover:bg-black/5 dark:text-white dark:hover:bg-white/5 ${
                  code === locale ? 'bg-black/5 dark:bg-white/5' : ''
                }`}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
