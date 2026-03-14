import { WEB_API_SECRET, WEB_API_URL } from '@env';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { Platform } from 'react-native';

import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { fetch } from '@/shared/lib/fetch';

const PUSH_REGISTER_URL = `${WEB_API_URL}/api/push/register`;

export type PushPermissionStatus = 'granted' | 'denied' | 'not-determined';

export async function requestPushPermission(): Promise<PushPermissionStatus> {
  if (Platform.OS !== 'ios') {
    return 'denied';
  }

  const result = await PushNotificationIOS.requestPermissions({
    alert: true,
    badge: true,
    sound: true,
  });

  const status = result.alert ? 'granted' : 'denied';
  return status;
}

export async function checkPushPermission(): Promise<PushPermissionStatus> {
  if (Platform.OS !== 'ios') {
    return 'denied';
  }

  return new Promise((resolve) => {
    PushNotificationIOS.checkPermissions((permissions) => {
      const status = permissions.alert ? 'granted' : 'denied';
      resolve(status);
    });
  });
}

export async function registerForPushToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') {
    return null;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('registrationError');
      resolve(null);
    }, 15_000);

    const onRegister = (token: string) => {
      clearTimeout(timeout);
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('registrationError');
      resolve(token);
    };

    const onError = () => {
      clearTimeout(timeout);
      PushNotificationIOS.removeEventListener('register');
      PushNotificationIOS.removeEventListener('registrationError');
      resolve(null);
    };

    PushNotificationIOS.addEventListener('register', onRegister);
    PushNotificationIOS.addEventListener('registrationError', onError);

    PushNotificationIOS.requestPermissions().then(({ alert }) => {
      if (!alert) {
        onError();
      }
    });
  });
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
      body: JSON.stringify({ deviceToken: token }),
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
