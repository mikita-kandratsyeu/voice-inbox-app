import { useProEntitlement } from '@/features/pro-license';

import { useEuStorefront } from './useEuStorefront';

export function useAdsAllowed(): { adsAllowed: boolean; resolved: boolean } {
  const { isEU } = useEuStorefront();
  const { isProActive } = useProEntitlement();

  const storefrontAllows = isEU === false;
  const adsAllowed = storefrontAllows && !isProActive;

  return {
    resolved: isEU !== null,
    adsAllowed,
  };
}
