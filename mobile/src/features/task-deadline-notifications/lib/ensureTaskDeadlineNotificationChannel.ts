import notifee, { AndroidImportance } from '@notifee/react-native';

import { i18n } from '@/shared/lib/i18n';

import {
  TASK_DEADLINE_ACTION_MARK_DONE,
  TASK_DEADLINE_ACTION_SNOOZE_1H,
  TASK_DEADLINE_NOTIFICATION_CHANNEL_ID,
  TASK_DEADLINE_NOTIFICATION_IOS_CATEGORY_ID,
  TASK_DEADLINE_PRESS_OPEN,
} from './constants';

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

  await notifee.setNotificationCategories([
    {
      id: TASK_DEADLINE_NOTIFICATION_IOS_CATEGORY_ID,
      actions: [
        {
          id: TASK_DEADLINE_ACTION_MARK_DONE,
          title: i18n.t('taskDeadlineNotifications.actions.markDone'),
          foreground: true,
        },
        {
          id: TASK_DEADLINE_ACTION_SNOOZE_1H,
          title: i18n.t('taskDeadlineNotifications.actions.snooze1h'),
          foreground: false,
        },
        {
          id: TASK_DEADLINE_PRESS_OPEN,
          title: i18n.t('taskDeadlineNotifications.sheet.openNote'),
          foreground: true,
        },
      ],
    },
  ]);

  channelReady = true;
}

export function resetTaskDeadlineNotificationChannelForTests(): void {
  channelReady = false;
}
