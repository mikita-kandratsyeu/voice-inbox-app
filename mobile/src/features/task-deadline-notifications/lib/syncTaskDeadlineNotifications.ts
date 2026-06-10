import notifee, { TriggerType } from '@notifee/react-native';

import type { TaskItem } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { diagWarn } from '@/shared/lib/appLogger';
import { i18n } from '@/shared/lib/i18n';

import { buildTaskDeadlineNotificationCopy } from './buildTaskDeadlineNotificationCopy';
import { collectSchedulableTaskDeadlines } from './collectSchedulableTaskDeadlines';
import {
  getTaskDeadlineNotificationId,
  isTaskDeadlineNotificationId,
  MAX_TASK_DEADLINE_NOTIFICATIONS,
  TASK_DEADLINE_ACTION_MARK_DONE,
  TASK_DEADLINE_ACTION_SNOOZE_1H,
  TASK_DEADLINE_NOTIFICATION_CHANNEL_ID,
  TASK_DEADLINE_NOTIFICATION_IOS_CATEGORY_ID,
  TASK_DEADLINE_NOTIFICATION_TYPE,
  TASK_DEADLINE_PRESS_OPEN,
} from './constants';
import { ensureTaskDeadlineNotificationChannel } from './ensureTaskDeadlineNotificationChannel';
import { pruneExpiredTaskDeadlineSnoozes } from './taskDeadlineSnoozeStorage';
import {
  checkTaskNotificationPermission,
  requestTaskNotificationPermission,
} from './requestTaskNotificationPermission';

const SYNC_DEBOUNCE_MS = 500;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

async function cancelAllTaskDeadlineNotifications(): Promise<void> {
  const ids = await notifee.getTriggerNotificationIds();
  await Promise.all(
    ids
      .filter((id) => isTaskDeadlineNotificationId(id))
      .map((id) => notifee.cancelTriggerNotification(id)),
  );
}

async function scheduleTaskDeadlineNotification(input: {
  recordId: string;
  recordTitle: string;
  task: TaskItem;
  triggerAt: number;
}): Promise<void> {
  const { title, body } = buildTaskDeadlineNotificationCopy(input.task, input.recordTitle);

  await notifee.createTriggerNotification(
    {
      id: getTaskDeadlineNotificationId(input.task.id),
      title,
      body,
      data: {
        type: TASK_DEADLINE_NOTIFICATION_TYPE,
        recordId: input.recordId,
        taskId: input.task.id,
      },
      android: {
        channelId: TASK_DEADLINE_NOTIFICATION_CHANNEL_ID,
        pressAction: { id: TASK_DEADLINE_PRESS_OPEN },
        actions: [
          {
            title: i18n.t('taskDeadlineNotifications.actions.markDone'),
            pressAction: { id: TASK_DEADLINE_ACTION_MARK_DONE },
          },
          {
            title: i18n.t('taskDeadlineNotifications.actions.snooze1h'),
            pressAction: { id: TASK_DEADLINE_ACTION_SNOOZE_1H },
          },
        ],
        sound: 'default',
      },
      ios: {
        sound: 'default',
        categoryId: TASK_DEADLINE_NOTIFICATION_IOS_CATEGORY_ID,
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: input.triggerAt,
    },
  );
}

export async function syncAllTaskDeadlineNotifications(): Promise<void> {
  const enabled = useSettingsStore.getState().taskDeadlineNotificationsEnabled;
  if (!enabled) {
    await cancelAllTaskDeadlineNotifications();
    return;
  }

  const permission = await checkTaskNotificationPermission();
  if (permission !== 'granted') {
    await cancelAllTaskDeadlineNotifications();
    return;
  }

  await ensureTaskDeadlineNotificationChannel();
  await cancelAllTaskDeadlineNotifications();

  const { useRecordStore } = await import('@/entities/record');
  const records = useRecordStore.getState().records;
  const snoozeByTaskId = pruneExpiredTaskDeadlineSnoozes();
  const schedulable = collectSchedulableTaskDeadlines(records, Date.now(), snoozeByTaskId).slice(
    0,
    MAX_TASK_DEADLINE_NOTIFICATIONS,
  );

  for (const item of schedulable) {
    await scheduleTaskDeadlineNotification({
      recordId: item.recordId,
      recordTitle: item.recordTitle,
      task: item.task,
      triggerAt: item.triggerAt,
    });
  }
}

export function scheduleTaskDeadlineNotificationSync(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
  }

  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncAllTaskDeadlineNotifications().catch((err) => {
      diagWarn('[task-deadline-notifications] sync failed', err);
    });
  }, SYNC_DEBOUNCE_MS);
}

export async function enableTaskDeadlineNotifications(): Promise<boolean> {
  const current = await checkTaskNotificationPermission();
  const granted =
    current === 'granted' || (await requestTaskNotificationPermission()) === 'granted';

  if (!granted) {
    return false;
  }

  useSettingsStore.getState().setTaskDeadlineNotificationsEnabled(true);
  await syncAllTaskDeadlineNotifications();
  return true;
}

export async function disableTaskDeadlineNotifications(): Promise<void> {
  useSettingsStore.getState().setTaskDeadlineNotificationsEnabled(false);
  const { clearAllTaskDeadlineSnoozes } = await import('./taskDeadlineSnoozeStorage');
  clearAllTaskDeadlineSnoozes();
  await cancelAllTaskDeadlineNotifications();
}

export function resetTaskDeadlineNotificationSyncForTests(): void {
  if (syncTimer) {
    clearTimeout(syncTimer);
    syncTimer = null;
  }
}
