import notifee, { AndroidImportance } from '@notifee/react-native';

import { i18n } from '@/shared/lib/i18n';

import { TASK_DEADLINE_NOTIFICATION_CHANNEL_ID } from './constants';

let channelReady = false;

export async function ensureTaskDeadlineNotificationChannel(): Promise<void> {
  if (channelReady) return;

  await notifee.createChannel({
    id: TASK_DEADLINE_NOTIFICATION_CHANNEL_ID,
    name: i18n.t('settings.taskDeadlineNotificationsChannel'),
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  channelReady = true;
}

export function resetTaskDeadlineNotificationChannelForTests(): void {
  channelReady = false;
}
