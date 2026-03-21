import { useEffect, useState } from 'react';

import { isEUUserByStorefront } from '../lib/storefront';

export function useEuStorefront(): { isEU: boolean | null } {
  const [isEU, setIsEU] = useState<boolean | null>(null);

  useEffect(() => {
    void isEUUserByStorefront().then(setIsEU);
  }, []);

  return { isEU };
}
