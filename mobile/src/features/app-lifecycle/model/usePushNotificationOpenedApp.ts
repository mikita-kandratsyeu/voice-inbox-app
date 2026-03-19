import { getMessaging, onNotificationOpenedApp } from '@react-native-firebase/messaging';
import { useEffect } from 'react';

import type { PushNotificationData } from '@/shared/lib/push';

type OnPushData = (data: PushNotificationData) => void;

export function usePushNotificationOpenedApp(onPushData: OnPushData): void {
  useEffect(() => {
    const messaging = getMessaging();
    const unsubscribe = onNotificationOpenedApp(messaging, (remoteMessage) => {
      if (remoteMessage.data) {
        onPushData(remoteMessage.data as unknown as PushNotificationData);
      }
    });

    return unsubscribe;
  }, [onPushData]);
}
