import * as admin from 'firebase-admin';

import { getPushMessages } from './push-messages';

export type PushPayload = {
  type: 'ai_complete' | 'policy_update' | 'limit_warning' | 'limit_exceeded';
  recordId?: string;
  title?: string;
  body?: string;
  message?: string;
};

const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

let initialized = false;

function initFirebase(): boolean {
  if (initialized) return admin.apps.length > 0;
  initialized = true;

  if (admin.apps.length > 0) return true;
  if (!FIREBASE_SERVICE_ACCOUNT?.trim()) return false;

  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT!;
    const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log('[FCM] initialized');
    return true;
  } catch (err) {
    console.error('[FCM] init failed:', err);
    return false;
  }
}

export async function sendPushViaFirebase(
  fcmToken: string,
  payload: PushPayload,
  locale?: string | null,
  completedCount?: number,
): Promise<boolean> {
  if (!initFirebase()) {
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
  } catch (err) {
    console.error('[FCM] send failed:', err, {
      type: payload.type,
      tokenLen: fcmToken.length,
    });
    return false;
  }
}
