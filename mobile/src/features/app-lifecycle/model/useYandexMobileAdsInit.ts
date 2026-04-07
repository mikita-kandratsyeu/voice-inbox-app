import { useEffect } from 'react';
import { AppState } from 'react-native';
import { isIOS } from 'react-native-draggable-flatlist/lib/typescript/constants';
import { PERMISSIONS, request } from 'react-native-permissions';
import { MobileAds } from 'yandex-mobile-ads';

import { useProEntitlement } from '@/features/pro-license';

let initialized = false;
let initializePromise: Promise<void> | null = null;

async function requestIosAppTrackingIfNeeded(): Promise<void> {
  if (!isIOS) {
    return;
  }

  try {
    await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
  } catch {
    if (__DEV__) {
      console.warn('[ads:init] request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY) failed');
    }
  }
}

async function ensureMobileAdsInitialized(): Promise<void> {
  if (initialized) {
    return;
  }

  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = Promise.resolve()
    .then(() => requestIosAppTrackingIfNeeded())
    .then(() => MobileAds.initialize())
    .then(() => {
      initialized = true;
    })
    .catch((err) => {
      initializePromise = null;
      throw err;
    });

  return initializePromise;
}

export function useYandexMobileAdsInit(): void {
  const { isProActive } = useProEntitlement();

  useEffect(() => {
    if (isProActive) {
      return;
    }

    let cancelled = false;

    const initAds = () => {
      if (cancelled || initialized) return;
      void ensureMobileAdsInitialized().catch((err) => {
        if (__DEV__) {
          console.warn('[ads:init] MobileAds.initialize failed', err);
        }
      });
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
