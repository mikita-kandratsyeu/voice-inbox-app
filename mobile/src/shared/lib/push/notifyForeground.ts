import { WEB_API_URL } from '@env';

import { fetchWithAuth } from '@/shared/lib/api-auth';
import { IS_IOS } from '@/shared/lib/platform';

const FOREGROUND_URL = `${WEB_API_URL}/api/push/foreground`;
const BACKGROUND_URL = `${WEB_API_URL}/api/push/background`;

async function callPushStateApi(url: string): Promise<void> {
  if (!IS_IOS) return;

  try {
    const response = await fetchWithAuth(url, { method: 'POST' });
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
