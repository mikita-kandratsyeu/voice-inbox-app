import notifee, { EventType } from '@notifee/react-native';
import { useEffect } from 'react';

import {
  handleTranscriptionPausedNotificationPress,
  openTranscriptionPausedNotification,
} from '@/app/model/transcriptionPausedNavigationHandler';

export function useTranscriptionPausedNotificationHandlers(): void {
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent((event) => {
      handleTranscriptionPausedNotificationPress(event);
    });

    void notifee.getInitialNotification().then((initial) => {
      if (!initial?.notification?.data) return;
      openTranscriptionPausedNotification(initial.notification.data);
    });

    return unsubscribe;
  }, []);
}

export function registerTranscriptionPausedNotificationBackgroundHandler(): void {
  notifee.onBackgroundEvent(async (event) => {
    if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
    handleTranscriptionPausedNotificationPress(event);
  });
}
