import { isSkipFirebaseAppCheckEnabled } from '@/shared/config/buildEnv';

/** Matches web `isFirebaseAppCheckSkipped`: dev build + `SKIP_FIREBASE_APP_CHECK=1`. */
export function shouldSkipFirebaseAppCheck(): boolean {
  return isSkipFirebaseAppCheckEnabled();
}
