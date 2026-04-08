import { useProEntitlement } from '@/features/pro-license';
import { useBootSplashVisible } from '@/shared/config';

export function useAdsAllowed(): { adsAllowed: boolean } {
  const { isProActive } = useProEntitlement();
  const bootSplashVisible = useBootSplashVisible();

  return { adsAllowed: !bootSplashVisible && !isProActive };
}
