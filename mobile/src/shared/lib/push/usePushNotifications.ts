import type { PushNotification } from '@react-native-community/push-notification-ios';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

import {
  registerForPushToken,
  sendTokenToBackend,
  type PushPermissionStatus,
} from './requestPermissionAndRegister';

export type PushNotificationData = {
  type?: string;
  recordId?: string;
  [key: string]: unknown;
};

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

    const onRemoteNotification = (notification: PushNotification) => {
      const data = notification.getData() as PushNotificationData | undefined;
      if (data && onNotification) {
        onNotification(data);
      }
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    };

    PushNotificationIOS.addEventListener('notification', onRemoteNotification);

    return () => {
      PushNotificationIOS.removeEventListener('notification');
    };
  }, [onNotification]);

  return { setupAndRegister };
}
