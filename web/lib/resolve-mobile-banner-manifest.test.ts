import {
  buildMobileBannerEtag,
  resolveMobileBannerManifestForDevice,
} from './resolve-mobile-banner-manifest';

jest.mock('@/lib/device-mobile-banner-store', () => ({
  getDeviceMobileBanner: jest.fn(),
}));

jest.mock('@/lib/mobile-banner-manifest-store', () => ({
  resolvePublishedMobileBannerManifest: jest.fn(),
}));

import { getDeviceMobileBanner } from '@/lib/device-mobile-banner-store';
import type { MobileBannerConfig } from '@/lib/mobile-banner-manifest';
import { resolvePublishedMobileBannerManifest } from '@/lib/mobile-banner-manifest-store';

const sampleBanner: MobileBannerConfig = {
  id: 'device_promo',
  enabled: true,
  ctaUrl: null,
  startsAt: null,
  endsAt: null,
  platforms: ['ios'],
  minAppVersion: null,
  dismissible: true,
  locales: {
    en: { title: 'Hi', body: 'Device banner', ctaLabel: null },
    ru: { title: '', body: '', ctaLabel: null },
  },
};

describe('resolve-mobile-banner-manifest', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns global manifest when device id is missing', async () => {
    jest.mocked(resolvePublishedMobileBannerManifest).mockResolvedValue({
      manifest: { schemaVersion: 2, revision: 7, banner: null },
      source: 'database',
    });

    const resolved = await resolveMobileBannerManifestForDevice(null);
    expect(resolved.personalized).toBe(false);
    expect(resolved.manifest.revision).toBe(7);
    expect(getDeviceMobileBanner).not.toHaveBeenCalled();
  });

  it('returns device banner when enabled override exists', async () => {
    jest.mocked(resolvePublishedMobileBannerManifest).mockResolvedValue({
      manifest: { schemaVersion: 2, revision: 7, banner: null },
      source: 'database',
    });
    jest.mocked(getDeviceMobileBanner).mockResolvedValue({
      deviceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      revision: 3,
      banner: sampleBanner,
      updatedAt: new Date('2026-06-24T12:00:00.000Z'),
    });

    const resolved = await resolveMobileBannerManifestForDevice(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );

    expect(resolved.personalized).toBe(true);
    expect(resolved.source).toBe('device');
    expect(resolved.manifest.banner?.id).toBe('device_promo');
    expect(resolved.manifest.revision).toBe(3);
  });

  it('falls back to global when device override is disabled', async () => {
    jest.mocked(resolvePublishedMobileBannerManifest).mockResolvedValue({
      manifest: {
        schemaVersion: 2,
        revision: 2,
        banner: { ...sampleBanner, id: 'global', enabled: true },
      },
      source: 'database',
    });
    jest.mocked(getDeviceMobileBanner).mockResolvedValue({
      deviceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      revision: 1,
      banner: { ...sampleBanner, enabled: false },
      updatedAt: new Date('2026-06-24T12:00:00.000Z'),
    });

    const resolved = await resolveMobileBannerManifestForDevice(
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );

    expect(resolved.personalized).toBe(false);
    expect(resolved.manifest.banner?.id).toBe('global');
  });

  it('builds distinct etags for global and device scopes', () => {
    const globalEtag = buildMobileBannerEtag({ schemaVersion: 2, revision: 7, banner: null });
    const deviceEtag = buildMobileBannerEtag(
      { schemaVersion: 2, revision: 3, banner: sampleBanner },
      {
        personalized: true,
        deviceId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      },
    );

    expect(globalEtag).toContain('database');
    expect(deviceEtag).toContain('d-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(globalEtag).not.toEqual(deviceEtag);
  });
});
