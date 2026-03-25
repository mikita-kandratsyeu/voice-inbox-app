import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useProEntitlement } from '@/features/pro-license';

import { ensureYandexMobileAdsInitialized } from './yandexMobileAdsState';

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
      void ensureYandexMobileAdsInitialized();
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
