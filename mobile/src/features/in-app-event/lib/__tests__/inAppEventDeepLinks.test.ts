import { tryParseInAppEventDeepLink } from '../inAppEventDeepLinks';

describe('tryParseInAppEventDeepLink', () => {
  it('parses voiceinbox://in-app-event/<id>', () => {
    expect(tryParseInAppEventDeepLink('voiceinbox://in-app-event/update_1-1-0')).toBe(
      'update_1-1-0',
    );
  });

  it('parses single-slash variant', () => {
    expect(tryParseInAppEventDeepLink('voiceinbox:/in-app-event/update_1-1-0')).toBe(
      'update_1-1-0',
    );
  });

  it('returns null for unrelated urls', () => {
    expect(tryParseInAppEventDeepLink('voiceinbox://record/start')).toBeNull();
  });
});
