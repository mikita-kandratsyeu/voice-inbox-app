import { diagWarn } from '@/shared/lib/appLogger';

import {
  BANNER_SOFT_TTL_MS,
  getCachedBannerManifest,
  hydrateBannerManifestCache,
  isBannerManifestFresh,
} from './bannerCache';
import { fetchRemoteBannerManifest } from './fetchRemoteBanner';
import type { MobileBannerManifest } from './types';

let inFlight: Promise<MobileBannerManifest | null> | null = null;

async function runRefresh(): Promise<MobileBannerManifest | null> {
  hydrateBannerManifestCache();

  if (isBannerManifestFresh(BANNER_SOFT_TTL_MS)) {
    const hit = getCachedBannerManifest();
    if (hit) {
      return hit;
    }
  }

  try {
    await fetchRemoteBannerManifest();
  } catch (e) {
    diagWarn('[mobile-banner] network error', e);
  }

  return getCachedBannerManifest();
}

export async function refreshMobileBannerManifest(): Promise<MobileBannerManifest | null> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = runRefresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function prefetchMobileBannerManifest(): void {
  void refreshMobileBannerManifest().catch(() => {});
}
