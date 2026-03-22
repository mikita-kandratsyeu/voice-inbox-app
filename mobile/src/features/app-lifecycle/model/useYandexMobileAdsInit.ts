import { useEffect } from 'react';
import { MobileAds } from 'yandex-mobile-ads';

import { useProEntitlement } from '@/features/pro-license';

export function useYandexMobileAdsInit(): void {
  const { isProActive } = useProEntitlement();

  useEffect(() => {
    if (isProActive) {
      return;
    }

    void MobileAds.initialize();
  }, [isProActive]);
}
