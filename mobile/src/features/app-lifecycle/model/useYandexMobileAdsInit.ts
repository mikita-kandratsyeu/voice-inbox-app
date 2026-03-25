import { useEffect } from 'react';
import { AppState } from 'react-native';
import { MobileAds } from 'yandex-mobile-ads';

import { useProEntitlement } from '@/features/pro-license';

export function useYandexMobileAdsInit(): void {
  const { isProActive } = useProEntitlement();

  useEffect(() => {
    if (isProActive) {
      return;
    }

    let cancelled = false;
    let initialized = false;

    const initAds = () => {
      if (cancelled || initialized) return;
      initialized = true;
      void MobileAds.initialize();
    };

    const deferredInitTimer = setTimeout(() => {
      if (AppState.currentState === 'active') {
        initAds();
      }
    }, 0);

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        initAds();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(deferredInitTimer);
      appStateSub.remove();
    };
  }, [isProActive]);
}
