import { runNavigationWhenUnlocked } from '@/app/navigation/deferredNavigation';
import {
  createBackupReminderNotificationPressHandler,
  handleBackupReminderNotificationData,
} from '@/features/backup-reminder-notifications';

import { navigationRef } from '../navigation/navigationRef';

const backupReminderNotificationPressDeps = {
  navigateToBackupSettings: () => {
    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('Main', {
        screen: 'SettingsRoot',
        params: {
          state: {
            routes: [{ name: 'Settings' }, { name: 'BackupRestore' }],
            index: 1,
          },
        },
      });
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
