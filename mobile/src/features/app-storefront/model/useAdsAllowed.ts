import { useSyncExternalStore } from 'react';

import { useProEntitlement } from '@/features/pro-license';
import { useBootSplashVisible } from '@/shared/config';
import {
  getInternalDebugDisableAdsSnapshot,
  subscribeInternalDebugDisableAds,
} from '@/shared/lib/internal-debug/internalDebugFlags';

export function computeAdsAllowedForInterstitial(isProActive: boolean): boolean {
  return !isProActive && !getInternalDebugDisableAdsSnapshot();
}

export function useAdsAllowed(): { adsAllowed: boolean } {
  const { isProActive } = useProEntitlement();
  const bootSplashVisible = useBootSplashVisible();
  const debugDisableAds = useSyncExternalStore(
    subscribeInternalDebugDisableAds,
    getInternalDebugDisableAdsSnapshot,
    getInternalDebugDisableAdsSnapshot,
  );

  return {
    adsAllowed: !bootSplashVisible && !isProActive && !debugDisableAds,
  };
}
