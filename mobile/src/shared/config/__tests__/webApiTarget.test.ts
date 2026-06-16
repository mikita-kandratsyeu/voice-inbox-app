import {
  DEFAULT_WEB_API_TARGET,
  parseWebApiTarget,
  resolveUrlFromTarget,
  resolveWebApiUrlFromTarget,
} from '../webApiTarget';

describe('parseWebApiTarget', () => {
  it('defaults to prod', () => {
    expect(parseWebApiTarget(undefined)).toBe('prod');
    expect(parseWebApiTarget('')).toBe('prod');
    expect(parseWebApiTarget('production')).toBe('prod');
    expect(parseWebApiTarget('invalid')).toBe('prod');
  });

  it('parses preview', () => {
    expect(parseWebApiTarget('preview')).toBe('preview');
    expect(parseWebApiTarget('PREVIEW')).toBe('preview');
  });

  it('documents default target', () => {
    expect(DEFAULT_WEB_API_TARGET).toBe('prod');
  });
});

describe('resolveUrlFromTarget', () => {
  const prodUrl = 'https://voiceinbox.ai';
  const previewUrl = 'https://preview.voiceinbox.ai';

  it('uses production URL when target is prod', () => {
    expect(
      resolveUrlFromTarget({
        target: 'prod',
        prodUrl,
        previewUrl,
      }),
    ).toBe(prodUrl);
  });

  it('uses preview URL when target is preview', () => {
    expect(
      resolveUrlFromTarget({
        target: 'preview',
        prodUrl,
        previewUrl,
      }),
    ).toBe(previewUrl);
  });
});

describe('resolveWebApiUrlFromTarget', () => {
  const prodUrl = 'https://api.voiceinbox.ai';
  const previewUrl = 'https://preview.voiceinbox.ai';

  it('uses production URL when target is prod', () => {
    expect(
      resolveWebApiUrlFromTarget({
        webApiTarget: 'prod',
        webApiUrl: prodUrl,
        previewWebApiUrl: previewUrl,
      }),
    ).toBe(prodUrl);
  });

  it('uses preview URL when target is preview', () => {
    expect(
      resolveWebApiUrlFromTarget({
        webApiTarget: 'preview',
        webApiUrl: prodUrl,
        previewWebApiUrl: previewUrl,
      }),
    ).toBe(previewUrl);
  });

  it('falls back to production when preview URL is missing', () => {
    expect(
      resolveWebApiUrlFromTarget({
        webApiTarget: 'preview',
        webApiUrl: prodUrl,
        previewWebApiUrl: '',
      }),
    ).toBe(prodUrl);
  });
});
