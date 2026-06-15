import type * as admin from 'firebase-admin';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

import { getPushMessages } from './push-messages';
import { cleanupInvalidPushToken } from './push-tokens';

export type PushPayload = {
  type: 'ai_complete' | 'policy_update' | 'limit_warning' | 'limit_exceeded';
  recordId?: string;
  title?: string;
  body?: string;
  message?: string;
};

/**
 * Check if FCM error indicates invalid/expired token.
 * These tokens should be removed from our database.
 */
function isTokenInvalidError(err: any): boolean {
  if (!err || typeof err !== 'object') return false;

  const errorCode = err.code || err.errorInfo?.code;

  // FCM error codes for invalid tokens that should be cleaned up:
  // - messaging/invalid-registration-token: malformed token
  // - messaging/registration-token-not-registered: token was unregistered (app reinstall, etc)
  // - messaging/invalid-argument: often means token format is wrong
  const invalidTokenCodes = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
    'messaging/invalid-argument',
  ];

  return invalidTokenCodes.includes(errorCode);
}

export async function sendPushViaFirebase(
  fcmToken: string,
  payload: PushPayload,
  locale?: string | null,
  completedCount?: number,
  deviceId?: string | null,
): Promise<boolean> {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.warn('[FCM] not available (no FIREBASE_SERVICE_ACCOUNT)');
    return false;
  }

  const defaults = getPushMessages(payload.type, locale, completedCount);

  const message: admin.messaging.Message = {
    token: fcmToken,
    notification: {
      title: payload.title ?? defaults.title,
      body: payload.body ?? defaults.body,
    },
    data: {
      type: payload.type,
      ...(payload.recordId && { recordId: payload.recordId }),
      ...(payload.message && { message: payload.message }),
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          'content-available': 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('[FCM] send ok', { type: payload.type, responseId: response });
    return true;
  } catch (err: any) {
    const errorCode = err?.code || err?.errorInfo?.code || 'unknown';

    console.error(
      '[FCM] send failed:',
      {
        type: payload.type,
        errorCode,
        tokenLen: fcmToken.length,
        deviceId,
      },
      err,
    );

    // Cleanup invalid tokens to prevent repeated failures
    if (isTokenInvalidError(err) && deviceId) {
      console.warn('[FCM] invalid token detected, cleaning up', { deviceId, errorCode });
      await cleanupInvalidPushToken(deviceId).catch((cleanupErr) => {
        console.error('[FCM] token cleanup failed', { deviceId }, cleanupErr);
      });
    }

    return false;
  }
}
