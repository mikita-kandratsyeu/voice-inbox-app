import { NextResponse } from 'next/server';

import { HEADER_FIREBASE_APP_CHECK } from '@/config/constants';
import { ApiErrorCode } from '@/lib/api-error-codes';
import { apiError, HttpStatus } from '@/lib/api/http-response';
import { getFirebaseAdmin, isFirebaseAdminConfigured } from '@/lib/firebase-admin';

export async function verifyFirebaseAppCheckToken(token: string): Promise<void> {
  const admin = getFirebaseAdmin();
  if (!admin) {
    throw new Error('Firebase Admin is not configured');
  }

  await admin.appCheck().verifyToken(token);
}

export async function requireAppCheckForToken(request: Request): Promise<NextResponse | null> {
  const token = request.headers.get(HEADER_FIREBASE_APP_CHECK)?.trim();
  if (!token) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { code: ApiErrorCode.Unauthorized });
  }

  if (!isFirebaseAdminConfigured()) {
    return apiError('Server misconfiguration', HttpStatus.UNAUTHORIZED, {
      code: ApiErrorCode.Unauthorized,
    });
  }

  try {
    await verifyFirebaseAppCheckToken(token);
    return null;
  } catch (err) {
    if (process.env.NODE_ENV === 'development' && err instanceof Error) {
      console.error('[app-check] verify failed', err.message);
    }
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { code: ApiErrorCode.Unauthorized });
  }
}
