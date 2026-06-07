import notifee, { EventType } from '@notifee/react-native';
import { useEffect } from 'react';

import {
  handleBackupReminderNotificationPress,
  openBackupReminderNotification,
} from '@/app/model/backupReminderNavigationHandler';
import {
  handleTaskDeadlineNotificationPress,
  openTaskDeadlineNotification,
} from '@/app/model/taskDeadlineNavigationHandler';
import {
  handleTranscriptionPausedNotificationPress,
  openTranscriptionPausedNotification,
} from '@/app/model/transcriptionPausedNavigationHandler';

export function useTaskDeadlineNotificationHandlers(): void {
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent((event) => {
      handleTaskDeadlineNotificationPress(event);
      handleBackupReminderNotificationPress(event);
      handleTranscriptionPausedNotificationPress(event);
    });

    void notifee.getInitialNotification().then((initial) => {
      if (!initial?.notification?.data) return;
      openTaskDeadlineNotification(initial.notification.data);
      openBackupReminderNotification(initial.notification.data);
      openTranscriptionPausedNotification(initial.notification.data);
    });

    return unsubscribe;
  }, []);
}

export function registerTaskDeadlineNotificationBackgroundHandler(): void {
  notifee.onBackgroundEvent(async (event) => {
    if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
    handleTaskDeadlineNotificationPress(event);
    handleBackupReminderNotificationPress(event);
    handleTranscriptionPausedNotificationPress(event);
  });
}
