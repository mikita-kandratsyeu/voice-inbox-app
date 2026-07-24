import type { Event } from '@notifee/react-native';
import { EventType } from '@notifee/react-native';

import { BACKUP_REMINDER_NOTIFICATION_TYPE } from './constants';

export type BackupReminderNotificationPressDeps = {
  navigateToBackupSettings: () => void;
};

function isBackupReminderNotificationData(
  data: Record<string, string | number | object> | undefined,
): boolean {
  return data?.type === BACKUP_REMINDER_NOTIFICATION_TYPE;
}

export function handleBackupReminderNotificationData(
  data: Record<string, string | number | object> | undefined,
  deps: BackupReminderNotificationPressDeps,
): void {
  if (!isBackupReminderNotificationData(data)) return;
  deps.navigateToBackupSettings();
}

export function handleBackupReminderNotificationPress(
  event: Event,
  deps: BackupReminderNotificationPressDeps,
): void {
  if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
  handleBackupReminderNotificationData(event.detail.notification?.data, deps);
}

export function createBackupReminderNotificationPressHandler(
  deps: BackupReminderNotificationPressDeps,
): (event: Event) => void {
  return (event) => {
    handleBackupReminderNotificationPress(event, deps);
  };
}
