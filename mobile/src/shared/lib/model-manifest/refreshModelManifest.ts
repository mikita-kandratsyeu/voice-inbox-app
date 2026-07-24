import { diagWarn } from '@/shared/lib/appLogger';

import { fetchRemoteModelManifest } from './fetchRemoteManifest';
import {
  getCachedManifest,
  hydrateManifestCache,
  isManifestFresh,
  MANIFEST_SOFT_TTL_MS,
} from './manifestCache';
import type { MobileModelManifest } from './types';

let inFlight: Promise<MobileModelManifest | null> | null = null;

async function runRefresh(): Promise<MobileModelManifest | null> {
  hydrateManifestCache();

  if (isManifestFresh(MANIFEST_SOFT_TTL_MS)) {
    const hit = getCachedManifest();

    if (hit) {
      return hit;
    }
  }

  try {
    await fetchRemoteModelManifest();
  } catch (e) {
    diagWarn('[model-manifest] network error', e);
  }

  return getCachedManifest();
}

export async function refreshModelManifest(): Promise<MobileModelManifest | null> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = runRefresh().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

export function prefetchModelManifest(): void {
  void refreshModelManifest().catch(() => {});
}
