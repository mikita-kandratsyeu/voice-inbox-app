import { NextResponse } from 'next/server';

import { HEADER_FIREBASE_APP_CHECK } from '@/config/constants';
import { isDevelopmentAppEnv } from '@/lib/app-env';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { recordAppCheckFailure } from '@/lib/api-telemetry';
import { apiError, HttpStatus } from '@/lib/api/http-response';
import { isAllowedFirebaseAppCheckAppId } from '@/lib/firebase-app-check-app-ids';
import { initFirebaseAdmin, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

/** Local dev only: `SKIP_FIREBASE_APP_CHECK=1` with `APP_ENV=development`. */
export function isFirebaseAppCheckSkipped(): boolean {
  return isDevelopmentAppEnv() && process.env.SKIP_FIREBASE_APP_CHECK === '1';
}

export async function verifyFirebaseAppCheckToken(token: string): Promise<void> {
  if (!initFirebaseAdmin()) {
    throw new Error('Firebase Admin is not configured');
  }

  const { getAppCheck } = await import('firebase-admin/app-check');
  const result = await getAppCheck().verifyToken(token);
  const appId = typeof result.appId === 'string' ? result.appId.trim() : '';
  if (!appId || !isAllowedFirebaseAppCheckAppId(appId)) {
    throw new Error('App Check app_id is not allowed');
  }
}

export async function requireAppCheckForToken(request: Request): Promise<NextResponse | null> {
  if (isFirebaseAppCheckSkipped()) {
    return null;
  }

  const token = request.headers.get(HEADER_FIREBASE_APP_CHECK)?.trim();
  if (!token) {
    void recordAppCheckFailure('missing');
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { code: ApiErrorCode.Unauthorized });
  }

  if (!isFirebaseAdminConfigured()) {
    void recordAppCheckFailure('misconfigured');
    return apiError('Server misconfiguration', HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.Unauthorized,
    });
  }

  try {
    await verifyFirebaseAppCheckToken(token);
    return null;
  } catch (err) {
    void recordAppCheckFailure('invalid');
    if (isDevelopmentAppEnv() && err instanceof Error) {
      console.error('[app-check] verify failed', err.message);
    }
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { code: ApiErrorCode.Unauthorized });
  }
}
