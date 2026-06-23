import { describe, expect, it } from '@jest/globals';

import { parseMobileBannerManifestJson } from '../parseManifest';

describe('parseMobileBannerManifestJson', () => {
  it('parses a localized manifest', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 2,
      revision: 2,
      banner: {
        id: 'launch',
        enabled: true,
        ctaUrl: 'https://voiceinbox.ai/blog',
        startsAt: null,
        endsAt: null,
        platforms: ['ios'],
        minAppVersion: null,
        dismissible: true,
        locales: {
          en: {
            title: 'Welcome',
            body: 'Try the new graph view.',
            ctaLabel: 'Open',
          },
          ru: {
            title: 'Добро пожаловать',
            body: 'Попробуйте новый граф.',
            ctaLabel: 'Открыть',
          },
        },
      },
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.banner?.locales.ru.title).toBe('Добро пожаловать');
  });

  it('rejects unsupported schema version', () => {
    const parsed = parseMobileBannerManifestJson({
      schemaVersion: 3,
      revision: 1,
      banner: null,
    });

    expect(parsed).toEqual({ ok: false, error: 'schemaVersion must be 1 or 2' });
  });
});
