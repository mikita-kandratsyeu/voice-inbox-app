import { useRecordStore } from '@/entities/record';

import {
  TASK_DEADLINE_ACTION_MARK_DONE,
  TASK_DEADLINE_ACTION_SNOOZE_1H,
  TASK_DEADLINE_PRESS_OPEN,
} from './constants';
import { extractTaskDeadlineNotificationIds } from './resolveTaskDeadlineSheetPayload';
import {
  getTaskDeadlineSnoozeTriggerAt,
  getTaskDeadlineTomorrowMorningTriggerAt,
  TASK_DEADLINE_SNOOZE_1H_MS,
  TASK_DEADLINE_SNOOZE_15M_MS,
} from './resolveTaskDeadlineTriggerAt';
import { scheduleTaskDeadlineNotificationSync } from './syncTaskDeadlineNotifications';
import { clearTaskDeadlineSnooze, setTaskDeadlineSnooze } from './taskDeadlineSnoozeStorage';

export type TaskDeadlineNotificationActionDeps = {
  navigateToRecord: (recordId: string) => void;
  navigateToAllTasks: () => void;
};

export type TaskDeadlineSnoozePreset = '15m' | '1h' | 'tomorrow';

export async function markTaskDeadlineNotificationDone(
  recordId: string,
  taskId: string,
): Promise<void> {
  const record = useRecordStore.getState().records.find((item) => item.id === recordId);
  const task = record?.tasks?.find((item) => item.id === taskId);
  if (!record || !task || task.isDone) return;

  await useRecordStore.getState().toggleTask(recordId, taskId);
  clearTaskDeadlineSnooze(taskId);
  scheduleTaskDeadlineNotificationSync();
}

export function snoozeTaskDeadlineNotification(
  taskId: string,
  preset: TaskDeadlineSnoozePreset,
  nowMs: number = Date.now(),
): void {
  const triggerAt =
    preset === '15m'
      ? getTaskDeadlineSnoozeTriggerAt(TASK_DEADLINE_SNOOZE_15M_MS, nowMs)
      : preset === '1h'
        ? getTaskDeadlineSnoozeTriggerAt(TASK_DEADLINE_SNOOZE_1H_MS, nowMs)
        : getTaskDeadlineTomorrowMorningTriggerAt(nowMs);

  setTaskDeadlineSnooze(taskId, triggerAt);
  scheduleTaskDeadlineNotificationSync();
}

export async function executeTaskDeadlineNotificationAction(
  actionId: string | undefined,
  data: Record<string, string | number | object> | undefined,
  deps: TaskDeadlineNotificationActionDeps,
): Promise<void> {
  const ids = extractTaskDeadlineNotificationIds(data);
  if (!ids) return;

  switch (actionId) {
    case TASK_DEADLINE_ACTION_MARK_DONE:
      await markTaskDeadlineNotificationDone(ids.recordId, ids.taskId);
      return;
    case TASK_DEADLINE_ACTION_SNOOZE_1H:
      snoozeTaskDeadlineNotification(ids.taskId, '1h');
      return;
    case TASK_DEADLINE_PRESS_OPEN: {
      const record = useRecordStore.getState().records.find((item) => item.id === ids.recordId);
      if (record) {
        deps.navigateToRecord(ids.recordId);
        return;
      }
      deps.navigateToAllTasks();
      return;
    }
    default:
      return;
  }
}
