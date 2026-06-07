import {
  createBackupReminderNotificationPressHandler,
  handleBackupReminderNotificationData,
} from '@/features/backup-reminder-notifications';

import { navigationRef } from '../navigation/navigationRef';

const backupReminderNotificationPressDeps = {
  navigateToBackupSettings: () => {
    if (!navigationRef.isReady()) return;

    navigationRef.navigate('Main', {
      screen: 'SettingsRoot',
      params: {
        screen: 'Settings',
      },
    });
  },
};

export const handleBackupReminderNotificationPress = createBackupReminderNotificationPressHandler(
  backupReminderNotificationPressDeps,
);

export function openBackupReminderNotification(
  data: Record<string, string | number | object> | undefined,
): void {
  handleBackupReminderNotificationData(data, backupReminderNotificationPressDeps);
}
