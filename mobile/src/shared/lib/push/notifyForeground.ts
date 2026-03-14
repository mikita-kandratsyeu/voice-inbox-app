import { WEB_API_SECRET, WEB_API_URL } from '@env';
import { Platform } from 'react-native';

import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { fetch } from '@/shared/lib/fetch';

const FOREGROUND_URL = `${WEB_API_URL}/api/push/foreground`;
const BACKGROUND_URL = `${WEB_API_URL}/api/push/background`;

async function callPushStateApi(url: string): Promise<void> {
  if (Platform.OS !== 'ios') return;

  try {
    const deviceId = await getOrCreateDeviceId();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': WEB_API_SECRET ?? '',
        'x-device-id': deviceId,
      },
    });
    if (!response.ok && __DEV__) {
      console.warn('[Push] state API failed', url, response.status);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[Push] state API error', url, err);
    }
  }
}

export async function notifyAppForeground(): Promise<void> {
  await callPushStateApi(FOREGROUND_URL);
}

export async function notifyAppBackground(): Promise<void> {
  await callPushStateApi(BACKGROUND_URL);
}
