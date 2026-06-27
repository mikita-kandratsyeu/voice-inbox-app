export const COOKIE_CONSENT_STORAGE_KEY = 'voice-inbox-cookie-consent';

export type CookieConsentChoice = 'accepted' | 'rejected';

export function isCookieConsentChoice(
  value: string | null | undefined,
): value is CookieConsentChoice {
  return value === 'accepted' || value === 'rejected';
}

export function readCookieConsent(): CookieConsentChoice | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
  return isCookieConsentChoice(raw) ? raw : null;
}

export function writeCookieConsent(choice: CookieConsentChoice): void {
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, choice);
}
