import notifee, { TriggerType } from '@notifee/react-native';

import { useSettingsStore } from '@/entities/settings';
import {
  checkTaskNotificationPermission,
  requestTaskNotificationPermission,
} from '@/features/task-deadline-notifications';
import { i18n } from '@/shared/lib/i18n';

import {
  BACKUP_REMINDER_NOTIFICATION_CHANNEL_ID,
  BACKUP_REMINDER_NOTIFICATION_TYPE,
  getBackupReminderNotificationId,
  isBackupReminderNotificationId,
  MAX_BACKUP_REMINDER_NOTIFICATIONS,
} from './constants';
import { ensureBackupReminderNotificationChannel } from './ensureBackupReminderNotificationChannel';

const DAY_MS = 24 * 60 * 60 * 1000;

async function cancelAllBackupReminderNotifications(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  await Promise.all(
    ids
      .filter((id) => isBackupReminderNotificationId(id))
      .map((id) => notifee.cancelTriggerNotification(id)),
  );
}

async function scheduleBackupReminderNotification(index: number, triggerAt: number): Promise<void> {
  await notifee.createTriggerNotification(
    {
      id: getBackupReminderNotificationId(index),
      title: i18n.t('backupReminderNotifications.title'),
      body: i18n.t('backupReminderNotifications.body'),
      data: {
        type: BACKUP_REMINDER_NOTIFICATION_TYPE,
      },
      android: {
        channelId: BACKUP_REMINDER_NOTIFICATION_CHANNEL_ID,
        pressAction: { id: 'default' },
        sound: 'default',
      },
      ios: {
        sound: 'default',
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerAt,
    },
  );
}

export async function syncAllBackupReminderNotifications(): Promise<void> {
  const { backupReminderNotificationsEnabled, backupReminderPeriodDays } =
    useSettingsStore.getState();

  if (!backupReminderNotificationsEnabled) {
    await cancelAllBackupReminderNotifications();
    return;
  }

  const permission = await checkTaskNotificationPermission();
  if (permission !== 'granted') {
    await cancelAllBackupReminderNotifications();
    return;
  }

  await ensureBackupReminderNotificationChannel();
  await cancelAllBackupReminderNotifications();

  const now = Date.now();
  const intervalMs = backupReminderPeriodDays * DAY_MS;

  for (let index = 0; index < MAX_BACKUP_REMINDER_NOTIFICATIONS; index += 1) {
    await scheduleBackupReminderNotification(index, now + intervalMs * (index + 1));
  }
}

export async function enableBackupReminderNotifications(): Promise<boolean> {
  const current = await checkTaskNotificationPermission();
  const granted =
    current === 'granted' || (await requestTaskNotificationPermission()) === 'granted';

  if (!granted) {
    return false;
  }

  useSettingsStore.getState().setBackupReminderNotificationsEnabled(true);
  await syncAllBackupReminderNotifications();
  return true;
}

export async function disableBackupReminderNotifications(): Promise<void> {
  useSettingsStore.getState().setBackupReminderNotificationsEnabled(false);
  await cancelAllBackupReminderNotifications();
}
