import { useEffect } from 'react';
import { MobileAds } from 'yandex-mobile-ads';

import { isEUUserByStorefront } from '@/features/app-storefront/lib/storefront';

export function useYandexMobileAdsInit(): void {
  useEffect(() => {
    let cancelled = false;

    void isEUUserByStorefront().then((eu) => {
      if (cancelled || eu) {
        return;
      }
      void MobileAds.initialize();
    });
    return () => {
      cancelled = true;
    };
  }, []);
}
