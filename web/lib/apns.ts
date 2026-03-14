import { readFileSync } from 'fs';
import { join } from 'path';
import { ApnsClient, Host, Notification } from 'apns2';

import { getPushMessages } from './push-messages';

const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_KEY_PATH = process.env.APNS_KEY_PATH;
const APNS_KEY_CONTENT = process.env.APNS_KEY_CONTENT;
const APNS_TOPIC =
  process.env.APNS_TOPIC ?? process.env.APP_BUNDLE_ID ?? 'com.mkandratsyeu.voiceinboxai';
const APNS_PRODUCTION = process.env.NODE_ENV === 'production';

let client: ApnsClient | null = null;

function normalizePem(key: string): string {
  return key.trim().replace(/\\n/g, '\n');
}

function getSigningKey(): string | null {
  if (APNS_KEY_CONTENT?.trim()) {
    return normalizePem(APNS_KEY_CONTENT);
  }
  if (APNS_KEY_PATH) {
    try {
      const keyPath = join(process.cwd(), APNS_KEY_PATH);
      const fileKey = readFileSync(keyPath, 'utf8');
      return fileKey.trim();
    } catch {
      return null;
    }
  }
  return null;
}

function getApnsClient(): ApnsClient | null {
  if (!APNS_KEY_ID || !APNS_TEAM_ID) {
    return null;
  }

  const signingKey = getSigningKey();
  if (!signingKey) {
    return null;
  }

  if (client) {
    return client;
  }

  try {
    client = new ApnsClient({
      team: APNS_TEAM_ID,
      keyId: APNS_KEY_ID,
      signingKey,
      defaultTopic: APNS_TOPIC,
      host: APNS_PRODUCTION ? Host.production : Host.development,
    });

    return client;
  } catch {
    return null;
  }
}

export type PushPayload = {
  type: 'ai_complete' | 'policy_update' | 'limit_warning';
  recordId?: string;
  title?: string;
  body?: string;
  message?: string;
};

export async function sendPushNotification(
  deviceToken: string,
  payload: PushPayload,
  locale?: string | null,
  completedCount?: number,
): Promise<boolean> {
  const apns = getApnsClient();
  if (!apns) {
    return false;
  }

  const defaults = getPushMessages(payload.type, locale, completedCount);
  const notification = new Notification(deviceToken, {
    alert: {
      title: payload.title ?? defaults.title,
      body: payload.body ?? defaults.body,
    },
    sound: 'default',
    data: {
      type: payload.type,
      ...(payload.recordId && { recordId: payload.recordId }),
      ...(payload.message && { message: payload.message }),
    },
  });

  try {
    await apns.send(notification);
    return true;
  } catch (err) {
    console.error('[APNS] send failed:', err);
    return false;
  }
}
