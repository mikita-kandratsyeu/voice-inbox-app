import { useEffect, useState } from 'react';

import { isAdsSecretGestureEnabled, useAdsForceDisabled } from '../lib/adsSecretGesture';
import { isEUUserByStorefront } from '../lib/storefront';

export function useAdsAllowed(): { adsAllowed: boolean; resolved: boolean } {
  const [isEU, setIsEU] = useState<boolean | null>(null);
  const forceAdsOff = useAdsForceDisabled();
  const secretGesture = isAdsSecretGestureEnabled();

  useEffect(() => {
    let cancelled = false;
    void isEUUserByStorefront().then((eu) => {
      if (!cancelled) {
        setIsEU(eu);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const storefrontAllows = isEU === false;
  const adsAllowed = storefrontAllows && !(secretGesture && forceAdsOff);

  return {
    resolved: isEU !== null,
    adsAllowed,
  };
}
