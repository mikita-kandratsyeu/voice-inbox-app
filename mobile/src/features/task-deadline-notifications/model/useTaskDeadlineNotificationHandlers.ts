import notifee, { EventType } from '@notifee/react-native';
import { useEffect } from 'react';

import {
  handleTaskDeadlineNotificationPress,
  openTaskDeadlineNotification,
} from '@/app/model/taskDeadlineNavigationHandler';

export function useTaskDeadlineNotificationHandlers(): void {
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent((event) => {
      handleTaskDeadlineNotificationPress(event);
    });

    void notifee.getInitialNotification().then((initial) => {
      if (!initial?.notification?.data) return;
      openTaskDeadlineNotification(initial.notification.data);
    });

    return unsubscribe;
  }, []);
}

export function registerTaskDeadlineNotificationBackgroundHandler(): void {
  notifee.onBackgroundEvent(async (event) => {
    if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
    handleTaskDeadlineNotificationPress(event);
  });
}
