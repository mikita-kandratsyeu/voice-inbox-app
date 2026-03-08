'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';

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
      ? 'inline-block transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-lg'
      : 'inline-block transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-900 rounded-lg';

  return (
    <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
      <a href="#" className={linkClasses} aria-label={t('appStore')}>
        <Image
          src={`/app-store-badge-${theme}.svg`}
          alt={t('appStore')}
          width={badgeWidth}
          height={badgeHeight}
          className="h-[54px] w-[180px] object-contain"
        />
      </a>
      <a href="#" className={linkClasses} aria-label={t('googlePlay')}>
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
