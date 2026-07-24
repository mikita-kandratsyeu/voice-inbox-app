import { useRecordStore } from '@/entities/record';
import { taskDeadlineFieldsFromTimestamp } from '@/shared/lib/taskDeadlineFieldsFromTimestamp';

import {
  getTaskDeadlineSnoozeTriggerAt,
  getTaskDeadlineTomorrowMorningTriggerAt,
  TASK_DEADLINE_SNOOZE_1H_MS,
  TASK_DEADLINE_SNOOZE_15M_MS,
} from './resolveTaskDeadlineTriggerAt';
import { scheduleTaskDeadlineNotificationSync } from './syncTaskDeadlineNotifications';
import { clearTaskDeadlineSnooze } from './taskDeadlineSnoozeStorage';

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

export async function snoozeTaskDeadlineNotification(
  recordId: string,
  taskId: string,
  preset: TaskDeadlineSnoozePreset,
  nowMs: number = Date.now(),
): Promise<void> {
  const record = useRecordStore.getState().records.find((item) => item.id === recordId);
  const task = record?.tasks?.find((item) => item.id === taskId);
  if (!record?.tasks || !task || task.isDone) return;

  const triggerAt =
    preset === '15m'
      ? getTaskDeadlineSnoozeTriggerAt(TASK_DEADLINE_SNOOZE_15M_MS, nowMs)
      : preset === '1h'
        ? getTaskDeadlineSnoozeTriggerAt(TASK_DEADLINE_SNOOZE_1H_MS, nowMs)
        : getTaskDeadlineTomorrowMorningTriggerAt(nowMs);

  const { deadline, deadlineTime } = taskDeadlineFieldsFromTimestamp(triggerAt);
  const nextTasks = record.tasks.map((item) =>
    item.id === taskId ? { ...item, deadline, deadlineTime } : item,
  );

  await useRecordStore.getState().updateTasks(recordId, nextTasks);
}
