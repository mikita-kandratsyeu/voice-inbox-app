import { useEffect, useState } from 'react';

import { isEUUserByStorefront } from '../lib/storefront';

export function useAdsAllowed(): { adsAllowed: boolean; resolved: boolean } {
  const [isEU, setIsEU] = useState<boolean | null>(null);

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

  return {
    resolved: isEU !== null,
    adsAllowed: isEU === false,
  };
}
