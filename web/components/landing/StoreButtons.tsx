'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/config/constants';

type Variant = 'hero' | 'cta';

interface StoreButtonsProps {
  variant?: Variant;
}

const STORE_BADGE_W = 180;
const STORE_BADGE_H = 54;

export function StoreButtons({ variant = 'hero' }: StoreButtonsProps): React.ReactElement {
  const t = useTranslations('hero');
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const lang = locale === 'ru' ? 'ru' : 'en';
  const themeKey = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';
  const appStoreBadgeSrc = `/app-store-${lang}-${themeKey}.png`;
  const googlePlayBadgeSrc = `/gp-${lang}-${themeKey}.png`;

  const storeLinkClasses =
    variant === 'cta'
      ? 'inline-flex shrink-0 rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40'
      : 'inline-flex shrink-0 rounded-xl transition-all duration-250 hover:-translate-y-0.5 hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:focus-visible:ring-white/30';

  return (
    <div className="flex flex-col items-center justify-center gap-y-2.5 sm:flex-row">
      <a
        href={APP_STORE_URL}
        className={storeLinkClasses}
        aria-label={`${t('appStoreLabel')} ${t('appStore')}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={appStoreBadgeSrc}
          alt=""
          width={STORE_BADGE_W}
          height={STORE_BADGE_H}
          className="h-[54px] w-[180px] object-contain"
          priority
          loading="eager"
          aria-hidden
        />
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        className={storeLinkClasses}
        aria-label={`${t('appStoreLabel')} ${t('appStore')}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={googlePlayBadgeSrc}
          alt=""
          width={STORE_BADGE_W}
          height={STORE_BADGE_H}
          className="h-[54px] w-[180px] object-contain"
          priority
          loading="eager"
          aria-hidden
        />
      </a>
    </div>
  );
}
