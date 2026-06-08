import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from '@react-native-firebase/messaging';

import { useSettingsStore } from '@/entities/settings';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { diagWarn } from '@/shared/lib/appLogger';
import { i18n } from '@/shared/lib/i18n';
import { IS_IOS, PLATFORM_OS } from '@/shared/lib/platform';
import { getPushRegistrationMetadata } from '@/shared/lib/push-register-metadata';

function getPushRegisterUrl(): string {
  return `${getWebApiUrl().replace(/\/$/, '')}/api/push/register`;
}
const PUSH_REGISTER_THROTTLE_MS = 5 * 60 * 1000;

let lastRegisteredToken: string | null = null;
let lastRegisteredLocale: string | null = null;
let lastRegisterTime = 0;

/** Locale bucket stored server-side for push copy (must match web `normalizePushLocale`). */
export function getPushRegisterLocale(): 'en' | 'ru' {
  const lang = (i18n.language ?? 'en').toLowerCase();
  return lang.startsWith('ru') ? 'ru' : 'en';
}

function markPushRegistered(token: string): void {
  lastRegisteredToken = token;
  lastRegisteredLocale = getPushRegisterLocale();
  lastRegisterTime = Date.now();
}

export type PushPermissionStatus = 'granted' | 'denied' | 'not-determined';

export async function ensurePushRegistered(): Promise<void> {
  if (!IS_IOS) return;
  if (!useSettingsStore.getState().aiProcessingAlertsEnabled) return;

  const status = await checkPushPermission();
  if (status !== 'granted') return;

  const token = await registerForPushToken();
  if (!token) return;

  const locale = getPushRegisterLocale();
  const now = Date.now();
  if (
    lastRegisteredToken === token &&
    lastRegisteredLocale === locale &&
    now - lastRegisterTime < PUSH_REGISTER_THROTTLE_MS
  ) {
    return;
  }

  await sendTokenToBackend(token);
}

/** Re-register push token when app language changes (updates server-side locale). */
export async function syncPushLocaleRegistration(): Promise<void> {
  await ensurePushRegistered();
}

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (!IS_IOS) {
    return 'denied';
  }

  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;

  return enabled ? 'granted' : 'denied';
}

export async function checkPushPermission(): Promise<PushPermissionStatus> {
  if (!IS_IOS) {
    return 'denied';
  }

  const messaging = getMessaging();
  const authStatus = await hasPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;

  if (enabled) return 'granted';
  if (authStatus === AuthorizationStatus.DENIED) return 'denied';
  return 'not-determined';
}

export async function registerForPushToken(): Promise<string | null> {
  if (!IS_IOS) {
    return null;
  }

  try {
    const messaging = getMessaging();
    const token = await getToken(messaging);
    return token ?? null;
  } catch {
    return null;
  }
}

export async function sendTokenToBackend(token: string): Promise<boolean> {
  const url = getPushRegisterUrl();
  const meta = getPushRegistrationMetadata();

  try {
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceToken: token,
        locale: getPushRegisterLocale(),
        platform: PLATFORM_OS,
        ...(meta.deviceModel ? { deviceModel: meta.deviceModel } : {}),
        ...(meta.appVersion ? { appVersion: meta.appVersion } : {}),
        ...(meta.buildNumber ? { buildNumber: meta.buildNumber } : {}),
        ...(meta.osVersion ? { osVersion: meta.osVersion } : {}),
      }),
    });

    if (!response.ok) {
      diagWarn('[Push] register token failed', response.status);
      return false;
    }

    markPushRegistered(token);
    return true;
  } catch (err) {
    diagWarn('[Push] register token error', err);
    return false;
  }
}

export async function enableAiProcessingAlerts(): Promise<boolean> {
  if (!IS_IOS) return false;

  const current = await checkPushPermission();
  const granted = current === 'granted' || (await requestPushPermission()) === 'granted';
  if (!granted) return false;

  useSettingsStore.getState().setAiProcessingAlertsEnabled(true);
  lastRegisteredToken = null;
  await ensurePushRegistered();
  return true;
}

export async function disableAiProcessingAlerts(): Promise<void> {
  useSettingsStore.getState().setAiProcessingAlertsEnabled(false);
  lastRegisteredToken = null;
  lastRegisteredLocale = null;
  lastRegisterTime = 0;
}
