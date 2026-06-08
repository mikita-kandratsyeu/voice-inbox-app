'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { marketingGutterClass } from '@/components/landing/marketing-layout';
import { APP_STORE_URL } from '@/config/constants';

export function MobileStickyCTA(): React.ReactElement {
  const t = useTranslations('header');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = (): void => {
      setIsVisible(window.scrollY > 140);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 pb-3 pt-2 transition-all duration-200 sm:hidden ${marketingGutterClass} ${
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      aria-hidden={!isVisible}
    >
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto flex min-h-[52px] w-full max-w-md flex-col items-center justify-center rounded-2xl bg-black px-4 py-2 text-white shadow-[0_16px_36px_rgba(10,10,10,0.35)] transition-[background-color,box-shadow,transform] active:scale-[0.99] hover:bg-black/90 hover:shadow-[0_18px_40px_rgba(10,10,10,0.4)] dark:bg-white dark:text-black dark:hover:bg-white/90 dark:hover:shadow-[0_18px_40px_rgba(255,255,255,0.2)]"
      >
        <span className="text-base font-semibold">{t('installApp')}</span>
        <span className="text-[0.7rem] opacity-80">{t('tryFree')}</span>
      </a>
    </div>
  );
}
