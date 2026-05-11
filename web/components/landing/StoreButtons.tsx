'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { APP_STORE_URL, GOOGLE_PLAY_URL, isPublicHttpUrl } from '@/config/constants';

const STORE_BADGE_W = 180;
const STORE_BADGE_H = 54;

const storeLinkClasses =
  'inline-flex shrink-0 rounded-xl hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 my-1.5';

export function StoreButtons(): React.ReactElement {
  const t = useTranslations('hero');

  const appStoreBadgeSrc = '/app-stores/app-store-en-dark.png';
  const googlePlayBadgeSrc = '/app-stores/gp-store-en-dark.png';

  const showGooglePlayBadge = isPublicHttpUrl(GOOGLE_PLAY_URL);

  return (
    <div className="flex flex-col items-center justify-center sm:flex-row">
      <a
        href={APP_STORE_URL}
        className={storeLinkClasses}
        aria-label={`${t('appStoreLabel')} ${t('appStore')}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src={appStoreBadgeSrc}
          alt="App Store"
          width={STORE_BADGE_W}
          height={STORE_BADGE_H}
          className="h-[54px] w-[180px] object-contain"
          priority
          loading="eager"
          aria-hidden
        />
      </a>
      {showGooglePlayBadge ? (
        <a
          href={GOOGLE_PLAY_URL}
          className={storeLinkClasses}
          aria-label={`${t('googlePlayLabel')} — ${t('googlePlay')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src={googlePlayBadgeSrc}
            alt="Google Play"
            width={STORE_BADGE_W}
            height={STORE_BADGE_H}
            className="h-[54px] w-[180px] object-contain"
            priority
            loading="eager"
            aria-hidden
          />
        </a>
      ) : null}
    </div>
  );
}
