import { WEB_API_SECRET, WEB_API_URL } from '@env';
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { fetch } from '@/shared/lib/fetch';
import { i18n } from '@/shared/lib/i18n';

const PUSH_REGISTER_URL = `${WEB_API_URL}/api/push/register`;
const PUSH_REGISTER_THROTTLE_MS = 5 * 60 * 1000;

let lastRegisteredToken: string | null = null;
let lastRegisterTime = 0;

export type PushPermissionStatus = 'granted' | 'denied' | 'not-determined';

export async function ensurePushRegistered(): Promise<void> {
  if (Platform.OS !== 'ios') return;

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
  if (Platform.OS !== 'ios') {
    return 'denied';
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled ? 'granted' : 'denied';
}

export async function checkPushPermission(): Promise<PushPermissionStatus> {
  if (Platform.OS !== 'ios') {
    return 'denied';
  }

  const authStatus = await messaging().hasPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) return 'granted';
  if (authStatus === messaging.AuthorizationStatus.DENIED) return 'denied';
  return 'not-determined';
}

export async function registerForPushToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  try {
    const token = await messaging().getToken();
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
