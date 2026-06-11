import { useRecordStore } from '@/entities/record';

import {
  getTaskDeadlineSnoozeTriggerAt,
  getTaskDeadlineTomorrowMorningTriggerAt,
  TASK_DEADLINE_SNOOZE_1H_MS,
  TASK_DEADLINE_SNOOZE_15M_MS,
} from './resolveTaskDeadlineTriggerAt';
import { scheduleTaskDeadlineNotificationSync } from './syncTaskDeadlineNotifications';
import { clearTaskDeadlineSnooze, setTaskDeadlineSnooze } from './taskDeadlineSnoozeStorage';

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
