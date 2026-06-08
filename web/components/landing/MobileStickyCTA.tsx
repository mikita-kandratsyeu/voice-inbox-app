'use client';

import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { marketingGutterClass } from '@/components/landing/marketing-layout';
import { GO_STORE_REDIRECT_PATH } from '@/config/constants';

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
      className={`fixed inset-x-0 bottom-4 z-50 sm:hidden ${marketingGutterClass} ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!isVisible}
    >
      <div
        className={`pb-[calc(env(safe-area-inset-bottom)+0.25rem)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        <div className="mx-auto max-w-md rounded-[1.35rem] border border-black/10 bg-white p-1.5 shadow-[0_10px_40px_rgba(15,23,42,0.14)] dark:border-white/12 dark:bg-slate-900 dark:shadow-[0_16px_48px_rgba(0,0,0,0.42)]">
          <a
            href={GO_STORE_REDIRECT_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-[54px] items-center gap-3 rounded-[1.1rem] bg-black px-3.5 py-2.5 text-white ring-1 ring-black/8 transition-[transform,box-shadow,background-color] active:scale-[0.985] dark:bg-white dark:text-black dark:ring-white/12"
          >
            <Image
              src="/app-icon.svg"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-[0.7rem] shadow-[0_6px_16px_rgba(59,130,246,0.28)]"
            />
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[0.9375rem] leading-tight font-semibold tracking-tight">
                {t('installApp')}
              </span>
              <span className="mt-0.5 block truncate text-[0.6875rem] font-medium text-white/72 dark:text-black/55">
                {t('tryFree')}
              </span>
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 transition-colors group-hover:bg-white/18 dark:bg-black/8 dark:group-hover:bg-black/12">
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
