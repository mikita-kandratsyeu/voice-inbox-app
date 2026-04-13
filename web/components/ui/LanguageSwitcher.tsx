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

type LanguageSwitcherVariant = 'default' | 'grouped';

interface LanguageSwitcherProps {
  variant?: LanguageSwitcherVariant;
}

export function LanguageSwitcher({
  variant = 'default',
}: LanguageSwitcherProps): React.ReactElement {
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
      const query = typeof window !== 'undefined' ? window.location.search : '';
      const href = query ? `${pathname}${query}` : pathname;
      router.replace(href, { locale: newLocale });
    });
  };

  const currentLabel = LOCALES.find((l) => l.code === locale)?.label ?? locale.toUpperCase();

  const triggerGrouped =
    'h-full min-h-0 min-w-0 gap-1 rounded-lg border-0 bg-transparent px-2.5 text-sm font-medium leading-none text-black/80 shadow-none ring-0 transition-colors hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/15 dark:text-white/85 dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/25 sm:gap-1.5 sm:px-3 sm:text-sm';

  const triggerDefault =
    'h-11 min-h-[44px] gap-1 rounded-xl border border-black/8 bg-black/[0.04] px-2.5 text-sm font-medium leading-none text-black shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] transition-[color,background-color,box-shadow] hover:bg-black/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/12 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:shadow-none dark:hover:bg-white/[0.1] dark:focus-visible:ring-white/20 sm:gap-1.5 sm:px-3.5 sm:text-sm';

  return (
    <div
      ref={containerRef}
      className={variant === 'grouped' ? 'relative flex min-h-0 items-stretch' : 'relative'}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
        className={`flex min-w-0 cursor-pointer items-center justify-center ${variant === 'grouped' ? triggerGrouped : triggerDefault} ${variant === 'default' ? 'sm:max-w-none' : ''}`}
      >
        <span className="sm:hidden">{locale.toUpperCase()}</span>
        <span className="hidden min-w-0 truncate sm:inline">{currentLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 ${isOpen ? 'rotate-180' : ''} transition-transform duration-200`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-38 overflow-hidden rounded-xl border border-black/8 bg-white/95 p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_16px_48px_rgba(0,0,0,0.45)]"
        >
          {LOCALES.map(({ code, label }) => (
            <li key={code} role="option" aria-selected={code === locale}>
              <button
                type="button"
                onClick={() => handleSelect(code)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-black transition-colors hover:bg-black/6 dark:text-white dark:hover:bg-white/8 ${
                  code === locale ? 'bg-black/6 dark:bg-white/10' : ''
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
