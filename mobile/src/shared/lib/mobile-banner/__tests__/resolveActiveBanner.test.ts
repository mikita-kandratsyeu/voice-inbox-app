import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { applyBannerFetchedOk, clearBannerCacheForTests } from '../bannerCache';
import {
  clearDismissedMobileBannerIdsForTests,
  dismissMobileBanner,
  pickMobileBannerLocaleContent,
  resolveActiveMobileBanner,
} from '../resolveActiveBanner';
import type { MobileBannerConfig, MobileBannerManifest } from '../types';

const mockStorageState = new Map<string, string | number>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key) as string | undefined,
    getNumber: (key: string) => mockStorageState.get(key) as number | undefined,
    set: (key: string, value: string | number) => {
      mockStorageState.set(key, value);
    },
    remove: (key: string) => {
      mockStorageState.delete(key);
    },
  },
}));

jest.mock('@/shared/lib/platform', () => ({
  IS_IOS: true,
  IS_ANDROID: false,
}));

jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: {
    version: '2.0.0',
  },
}));

const sampleBannerConfig: MobileBannerConfig = {
  id: 'summer_pro_2026',
  enabled: true,
  ctaUrl: 'voiceinbox://settings/pro',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-12-31T23:59:59.000Z',
  platforms: ['ios'],
  minAppVersion: '1.4.0',
  dismissible: true,
  locales: {
    en: {
      title: 'Try Pro',
      body: 'Limited offer this week.',
      ctaLabel: 'Open',
    },
    ru: {
      title: 'Попробуйте Pro',
      body: 'Предложение на этой неделе.',
      ctaLabel: 'Открыть',
    },
  },
};

function seedManifest(banner: MobileBannerManifest['banner']): void {
  applyBannerFetchedOk(
    {
      schemaVersion: 2,
      revision: 1,
      banner,
    },
    'etag-1',
    Date.now(),
  );
}

describe('resolveActiveMobileBanner', () => {
  beforeEach(() => {
    mockStorageState.clear();
    clearBannerCacheForTests();
    clearDismissedMobileBannerIdsForTests();
  });

  it('returns null when no manifest is cached', () => {
    expect(resolveActiveMobileBanner('en')).toBeNull();
  });

  it('returns localized copy for the requested locale', () => {
    seedManifest(sampleBannerConfig);
    expect(resolveActiveMobileBanner('ru', Date.parse('2026-06-01T12:00:00.000Z'))?.title).toBe(
      'Попробуйте Pro',
    );
    expect(resolveActiveMobileBanner('en', Date.parse('2026-06-01T12:00:00.000Z'))?.title).toBe(
      'Try Pro',
    );
  });

  it('falls back to English when the requested locale is empty', () => {
    seedManifest({
      ...sampleBannerConfig,
      locales: {
        en: sampleBannerConfig.locales.en,
        ru: { title: '', body: '', ctaLabel: null },
      },
    });
    expect(resolveActiveMobileBanner('ru', Date.parse('2026-06-01T12:00:00.000Z'))?.title).toBe(
      'Try Pro',
    );
  });

  it('hides expired banners', () => {
    seedManifest(sampleBannerConfig);
    expect(resolveActiveMobileBanner('en', Date.parse('2027-01-01T00:00:00.000Z'))).toBeNull();
  });

  it('hides dismissed banners', () => {
    seedManifest(sampleBannerConfig);
    dismissMobileBanner(sampleBannerConfig.id);
    expect(resolveActiveMobileBanner('en', Date.parse('2026-06-01T12:00:00.000Z'))).toBeNull();
  });
});

describe('pickMobileBannerLocaleContent', () => {
  it('prefers Russian when available and requested', () => {
    expect(pickMobileBannerLocaleContent(sampleBannerConfig.locales, 'ru')?.title).toBe(
      'Попробуйте Pro',
    );
  });
});
