import { useEffect } from 'react';
import { MobileAds } from 'yandex-mobile-ads';

import { isEUUserByStorefront } from '@/features/app-storefront/lib/storefront';
import { useProEntitlement } from '@/features/pro-license';

export function useYandexMobileAdsInit(): void {
  const { isProActive } = useProEntitlement();

  useEffect(() => {
    if (isProActive) {
      return;
    }

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
  }, [isProActive]);
}
