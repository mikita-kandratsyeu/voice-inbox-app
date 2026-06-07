import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { diagWarn } from '@/shared/lib/appLogger';
import { IS_IOS } from '@/shared/lib/platform';

function getForegroundUrl(): string {
  return `${getWebApiUrl().replace(/\/$/, '')}/api/push/foreground`;
}

function getBackgroundUrl(): string {
  return `${getWebApiUrl().replace(/\/$/, '')}/api/push/background`;
}

async function callPushStateApi(url: string): Promise<void> {
  if (!IS_IOS) return;

  try {
    const response = await fetchWithAuth(url, { method: 'POST' });
    if (!response.ok) {
      diagWarn('[Push] state API failed', { url, status: response.status });
    }
  } catch (err) {
    diagWarn('[Push] state API error', { url }, err);
  }
}

export async function notifyAppForeground(): Promise<void> {
  await callPushStateApi(getForegroundUrl());
}

export async function notifyAppBackground(): Promise<void> {
  await callPushStateApi(getBackgroundUrl());
}
