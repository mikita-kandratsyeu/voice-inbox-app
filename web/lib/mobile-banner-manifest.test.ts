import {
  createDefaultMobileBannerManifest,
  parseMobileBannerManifestJson,
  parseMobileBannerManifestString,
} from './mobile-banner-manifest';

describe('mobile-banner-manifest', () => {
  it('parses a localized v2 manifest', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 2,
      revision: 3,
      banner: {
        id: 'summer_pro_2026',
        enabled: true,
        ctaUrl: 'voiceinbox://settings/pro',
        startsAt: '2026-06-23T00:00:00.000Z',
        endsAt: '2026-06-30T23:59:59.000Z',
        platforms: ['ios', 'android'],
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
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.schemaVersion).toBe(2);
    expect(parsed.manifest.revision).toBe(3);
    expect(parsed.manifest.banner?.locales.ru.title).toBe('Попробуйте Pro');
  });

  it('migrates legacy v1 manifest into v2 locales.en', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 1,
      revision: 1,
      banner: {
        id: 'legacy',
        enabled: true,
        title: 'Try Pro',
        body: 'Limited offer this week.',
        ctaLabel: 'Open',
        ctaUrl: 'voiceinbox://settings/pro',
        startsAt: null,
        endsAt: null,
        platforms: ['ios'],
        minAppVersion: null,
        dismissible: true,
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.schemaVersion).toBe(2);
    expect(parsed.manifest.banner?.locales.en.title).toBe('Try Pro');
    expect(parsed.manifest.banner?.ctaUrl).toBe('voiceinbox://settings/pro');
  });

  it('accepts null banner', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 2,
      revision: 0,
      banner: null,
    });

    expect(parsed).toEqual({
      ok: true,
      manifest: createDefaultMobileBannerManifest(),
    });
  });

  it('rejects locale ctaLabel without shared ctaUrl', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 2,
      revision: 1,
      banner: {
        id: 'cta_only_label',
        enabled: true,
        ctaUrl: null,
        startsAt: null,
        endsAt: null,
        platforms: ['ios'],
        minAppVersion: null,
        dismissible: true,
        locales: {
          en: {
            title: 'Title',
            body: 'Body',
            ctaLabel: 'Open',
          },
          ru: {
            title: '',
            body: '',
            ctaLabel: null,
          },
        },
      },
    });

    expect(parsed).toEqual({
      ok: false,
      error: 'banner.locales.en.ctaLabel requires banner.ctaUrl',
    });
  });

  it('accepts mailto CTA URLs', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 2,
      revision: 1,
      banner: {
        id: 'feedback',
        enabled: true,
        ctaUrl: 'mailto:support@example.com?subject=Voice%20Inbox%20feedback',
        startsAt: null,
        endsAt: null,
        platforms: ['ios'],
        minAppVersion: null,
        dismissible: true,
        locales: {
          en: {
            title: 'Help us improve',
            body: 'Send us your feedback.',
            ctaLabel: 'Email us',
          },
          ru: {
            title: '',
            body: '',
            ctaLabel: null,
          },
        },
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.banner?.ctaUrl).toBe(
      'mailto:support@example.com?subject=Voice%20Inbox%20feedback',
    );
  });

  it('rejects invalid date order', () => {
    const parsed = parseMobileBannerManifestString(
      JSON.stringify({
        schemaVersion: 2,
        revision: 1,
        banner: {
          id: 'bad_dates',
          enabled: true,
          ctaUrl: null,
          startsAt: '2026-07-01T00:00:00.000Z',
          endsAt: '2026-06-01T00:00:00.000Z',
          platforms: ['android'],
          minAppVersion: null,
          dismissible: false,
          locales: {
            en: { title: 'Title', body: 'Body', ctaLabel: null },
            ru: { title: '', body: '', ctaLabel: null },
          },
        },
      }),
    );

    expect(parsed).toEqual({
      ok: false,
      error: 'banner.startsAt must be before banner.endsAt',
    });
  });
});
