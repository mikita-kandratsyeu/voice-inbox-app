import messaging from '@react-native-firebase/messaging';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import {
  type PushPermissionStatus,
  registerForPushToken,
  sendTokenToBackend,
} from './requestPermissionAndRegister';

export type PushNotificationData = {
  type?: string;
  recordId?: string;
  message?: string;
  [key: string]: unknown;
};

function extractData(remoteMessage: {
  data?: Record<string, string> | null;
}): PushNotificationData | undefined {
  const data = remoteMessage.data;
  if (!data || typeof data !== 'object') return undefined;
  return data as unknown as PushNotificationData;
}

export function usePushNotifications(options?: {
  onNotification?: (data: PushNotificationData) => void;
  onPermissionChange?: (status: PushPermissionStatus) => void;
}) {
  const onNotification = options?.onNotification;
  const onPermissionChange = options?.onPermissionChange;

  const setupAndRegister = useCallback(async () => {
    if (Platform.OS !== 'ios') return;

    const token = await registerForPushToken();
    if (!token) return;

    const sent = await sendTokenToBackend(token);
    if (sent && onPermissionChange) {
      onPermissionChange('granted');
    }
  }, [onPermissionChange]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      const data = extractData(remoteMessage);
      if (data && onNotification) {
        onNotification(data);
      }
    });

    return unsubscribe;
  }, [onNotification]);

  return { setupAndRegister };
}
