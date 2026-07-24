import { diagInfo } from '@/shared/lib/appLogger';

import { clearMobileBannerManifestCache } from './bannerCache';
import { clearDismissedMobileBannerIdsForTests } from './resolveActiveBanner';

export function resetMobileBannerLocalCache(): void {
  clearMobileBannerManifestCache();
  clearDismissedMobileBannerIdsForTests();
  diagInfo('[mobile-banner] local cache reset');
}
