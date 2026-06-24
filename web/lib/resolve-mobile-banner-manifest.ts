import { getDeviceMobileBanner } from '@/lib/device-mobile-banner-store';
import {
  createDefaultMobileBannerManifest,
  type MobileBannerManifest,
} from '@/lib/mobile-banner-manifest';
import { resolvePublishedMobileBannerManifest } from '@/lib/mobile-banner-manifest-store';

export type ResolvedMobileBannerManifest = {
  manifest: MobileBannerManifest;
  source: 'default' | 'database' | 'device';
  personalized: boolean;
};

export function buildMobileBannerEtag(
  manifest: MobileBannerManifest,
  opts?: { personalized?: boolean; deviceId?: string },
): string {
  if (opts?.personalized && opts.deviceId) {
    return `W/"b${manifest.schemaVersion}-d-${opts.deviceId.trim()}-r${manifest.revision}"`;
  }

  const source = manifest.revision > 0 ? 'database' : 'default';
  return `W/"b${manifest.schemaVersion}-${source}-${manifest.revision}"`;
}

export async function resolveMobileBannerManifestForDevice(
  deviceId?: string | null,
): Promise<ResolvedMobileBannerManifest> {
  const global = await resolvePublishedMobileBannerManifest();

  const trimmedDeviceId = deviceId?.trim();
  if (!trimmedDeviceId) {
    return {
      manifest: global.manifest,
      source: global.source,
      personalized: false,
    };
  }

  const deviceRecord = await getDeviceMobileBanner(trimmedDeviceId);
  if (!deviceRecord?.banner.enabled) {
    return {
      manifest: global.manifest,
      source: global.source,
      personalized: false,
    };
  }

  return {
    manifest: {
      schemaVersion: 2,
      revision: deviceRecord.revision,
      banner: deviceRecord.banner,
    },
    source: 'device',
    personalized: true,
  };
}

export function emptyMobileBannerManifest(): MobileBannerManifest {
  return createDefaultMobileBannerManifest();
}
