const ALLOWED_APP_IDS = new Set(
  (process.env.FIREBASE_APP_CHECK_APP_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
);

export function isFirebaseAppCheckAppIdValidationEnabled(): boolean {
  return ALLOWED_APP_IDS.size > 0;
}

export function isAllowedFirebaseAppCheckAppId(appId: string): boolean {
  if (!isFirebaseAppCheckAppIdValidationEnabled()) {
    return true;
  }

  return ALLOWED_APP_IDS.has(appId.trim());
}
