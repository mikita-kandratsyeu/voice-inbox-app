import { isCookieConsentChoice } from './cookie-consent';

describe('cookie-consent', () => {
  it('validates consent choices', () => {
    expect(isCookieConsentChoice('accepted')).toBe(true);
    expect(isCookieConsentChoice('rejected')).toBe(true);
    expect(isCookieConsentChoice('pending')).toBe(false);
    expect(isCookieConsentChoice(null)).toBe(false);
    expect(isCookieConsentChoice(undefined)).toBe(false);
  });
});
