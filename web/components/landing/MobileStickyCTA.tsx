'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

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
      className={`fixed inset-x-0 bottom-0 z-50 px-4 pb-3 pt-2 transition-all duration-200 sm:hidden ${
        isVisible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
      aria-hidden={!isVisible}
    >
      <a
        href="#download"
        className="mx-auto flex min-h-[52px] w-full max-w-md flex-col items-center justify-center rounded-2xl bg-black px-4 py-2 text-white shadow-[0_16px_36px_rgba(10,10,10,0.35)] dark:bg-white dark:text-black"
      >
        <span className="text-base font-semibold">{t('installApp')}</span>
        <span className="text-[0.7rem] opacity-80">{t('tryFree')}</span>
      </a>
    </div>
  );
}
