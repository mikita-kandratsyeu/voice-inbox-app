import notifee, { AndroidImportance } from '@notifee/react-native';

import { i18n } from '@/shared/lib/i18n';

import { BACKUP_REMINDER_NOTIFICATION_CHANNEL_ID } from './constants';

let channelReady = false;

export async function ensureBackupReminderNotificationChannel(): Promise<void> {
  if (channelReady) return;

  await notifee.createChannel({
    id: BACKUP_REMINDER_NOTIFICATION_CHANNEL_ID,
    name: i18n.t('settings.backupReminderNotificationsChannel'),
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  channelReady = true;
}

export function resetBackupReminderNotificationChannelForTests(): void {
  channelReady = false;
}
