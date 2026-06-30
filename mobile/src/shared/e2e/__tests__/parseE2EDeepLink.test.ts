import { tryParseE2EDeepLink } from '../parseE2EDeepLink';

describe('tryParseE2EDeepLink', () => {
  it('parses e2e reset with defaults', () => {
    expect(tryParseE2EDeepLink('voiceinbox://e2e/reset')).toEqual({
      type: 'reset',
      skipOnboarding: true,
      skipAppLock: true,
      mockPro: false,
      disableAds: true,
      prepareSkipUi: false,
    });
  });

  it('parses e2e reset query flags', () => {
    expect(
      tryParseE2EDeepLink('voiceinbox://e2e/reset?mockPro=1&disableAds=0&skipOnboarding=0'),
    ).toEqual({
      type: 'reset',
      skipOnboarding: false,
      skipAppLock: true,
      mockPro: true,
      disableAds: false,
      prepareSkipUi: false,
    });
  });

  it('parses prepareSkipUi for onboarding skip UI test', () => {
    expect(
      tryParseE2EDeepLink('voiceinbox://e2e/reset?skipOnboarding=0&prepareSkipUi=1'),
    ).toEqual({
      type: 'reset',
      skipOnboarding: false,
      skipAppLock: true,
      mockPro: false,
      disableAds: true,
      prepareSkipUi: true,
    });
  });

  it('parses seed-text-note', () => {
    expect(tryParseE2EDeepLink('voiceinbox://e2e/seed-text-note?title=Hello&body=World')).toEqual({
      type: 'seed-text-note',
      title: 'Hello',
      body: 'World',
      id: undefined,
    });
  });

  it('returns null for unrelated links', () => {
    expect(tryParseE2EDeepLink('voiceinbox://tasks')).toBeNull();
  });
});
