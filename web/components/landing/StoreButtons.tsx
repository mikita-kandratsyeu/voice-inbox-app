'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/config/constants';

type Variant = 'hero' | 'cta';

interface StoreButtonsProps {
  variant?: Variant;
}

const badgeWidth = 180;
const badgeHeight = 54;

export function StoreButtons({ variant = 'hero' }: StoreButtonsProps): React.ReactElement {
  const t = useTranslations('hero');
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const theme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

  const appStoreUrl = APP_STORE_URL;
  const googlePlayUrl = GOOGLE_PLAY_URL;

  const linkClasses =
    variant === 'hero'
      ? 'inline-block transition-transform hover:scale-105 focus:outline-none rounded-lg'
      : 'inline-block transition-transform hover:scale-105 focus:outline-none rounded-lg';

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
      <a href={appStoreUrl} className={linkClasses} aria-label={t('appStore')}>
        <Image
          src={`/app-store-badge-${theme}.svg`}
          alt={t('appStore')}
          width={badgeWidth}
          height={badgeHeight}
          className="h-[54px] w-[180px] object-contain"
        />
      </a>
      <a href={googlePlayUrl} className={linkClasses} aria-label={t('googlePlay')}>
        <Image
          src={`/google-play-badge-${theme}.svg`}
          alt={t('googlePlay')}
          width={badgeWidth}
          height={badgeHeight}
          className="h-[54px] w-[180px] object-contain"
        />
      </a>
    </div>
  );
}
