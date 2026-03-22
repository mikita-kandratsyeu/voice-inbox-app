import { useProEntitlement } from '@/features/pro-license';

export function useAdsAllowed(): { adsAllowed: boolean } {
  const { isProActive } = useProEntitlement();

  return { adsAllowed: !isProActive };
}
