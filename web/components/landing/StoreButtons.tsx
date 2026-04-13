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

  const linkClasses =
    variant === 'hero'
      ? 'inline-flex min-h-[48px] items-center justify-center rounded-lg transition-transform hover:scale-[1.02] focus:outline-none'
      : 'inline-flex min-h-[48px] items-center justify-center rounded-lg transition-transform hover:scale-[1.02] focus:outline-none';

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
      <a
        href={APP_STORE_URL}
        className={linkClasses}
        aria-label={t('appStore')}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={`/app-store-badge-${theme}.svg`}
          alt={t('appStore')}
          width={badgeWidth}
          height={badgeHeight}
          className="h-[54px] w-[180px] object-contain"
        />
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        className={linkClasses}
        aria-label={t('googlePlay')}
        target="_blank"
        rel="noopener noreferrer"
      >
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
