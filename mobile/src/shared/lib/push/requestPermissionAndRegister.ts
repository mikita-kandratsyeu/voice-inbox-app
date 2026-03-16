import { WEB_API_SECRET, WEB_API_URL } from '@env';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from '@react-native-firebase/messaging';

import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { fetch } from '@/shared/lib/fetch';
import { i18n } from '@/shared/lib/i18n';
import { IS_IOS, PLATFORM_OS } from '@/shared/lib/platform';

const PUSH_REGISTER_URL = `${WEB_API_URL}/api/push/register`;
const PUSH_REGISTER_THROTTLE_MS = 5 * 60 * 1000;

let lastRegisteredToken: string | null = null;
let lastRegisterTime = 0;

export type PushPermissionStatus = 'granted' | 'denied' | 'not-determined';

export async function ensurePushRegistered(): Promise<void> {
  if (!IS_IOS) return;

  const status = await checkPushPermission();
  if (status !== 'granted') return;

  const token = await registerForPushToken();
  if (!token) return;

  const now = Date.now();
  if (lastRegisteredToken === token && now - lastRegisterTime < PUSH_REGISTER_THROTTLE_MS) {
    return;
  }

  const ok = await sendTokenToBackend(token);
  if (ok) {
    lastRegisteredToken = token;
    lastRegisterTime = now;
  }
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
  const deviceId = await getOrCreateDeviceId();
  const url = PUSH_REGISTER_URL;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-secret': WEB_API_SECRET ?? '',
        'x-device-id': deviceId,
      },
      body: JSON.stringify({
        deviceToken: token,
        locale: (i18n.language ?? 'en').slice(0, 2),
        platform: PLATFORM_OS,
      }),
    });

    if (!response.ok) {
      if (__DEV__) {
        console.warn('[Push] register token failed', response.status);
      }
      return false;
    }

    return true;
  } catch (err) {
    if (__DEV__) {
      console.warn('[Push] register token error', err);
    }
    return false;
  }
}
