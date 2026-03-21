import { useProEntitlement } from '@/features/pro-license';

import { isAdsSecretGestureEnabled, useAdsForceDisabled } from '../lib/adsSecretGesture';
import { useEuStorefront } from './useEuStorefront';

export function useAdsAllowed(): { adsAllowed: boolean; resolved: boolean } {
  const { isEU } = useEuStorefront();
  const forceAdsOff = useAdsForceDisabled();
  const secretGesture = isAdsSecretGestureEnabled();
  const { isProActive } = useProEntitlement();

  const storefrontAllows = isEU === false;
  const adsAllowed = storefrontAllows && !(secretGesture && forceAdsOff) && !isProActive;

  return {
    resolved: isEU !== null,
    adsAllowed,
  };
}
