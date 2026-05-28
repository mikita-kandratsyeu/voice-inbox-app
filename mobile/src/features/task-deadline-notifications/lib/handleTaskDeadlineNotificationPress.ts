import type { Event } from '@notifee/react-native';
import { EventType } from '@notifee/react-native';

import { useRecordStore } from '@/entities/record';
import { isString } from '@/shared/lib/type-guards';

import { TASK_DEADLINE_NOTIFICATION_TYPE } from './constants';

export type TaskDeadlineNotificationPressDeps = {
  navigateToRecord: (recordId: string) => void;
  navigateToAllTasks: () => void;
};

function extractTaskDeadlinePressData(
  data: Record<string, string | number | object> | undefined,
): { recordId: string; taskId: string } | null {
  if (!data || data.type !== TASK_DEADLINE_NOTIFICATION_TYPE) return null;

  const recordId = isString(data.recordId) ? data.recordId.trim() : '';
  const taskId = isString(data.taskId) ? data.taskId.trim() : '';
  if (!recordId || !taskId) return null;

  return { recordId, taskId };
}

export function handleTaskDeadlineNotificationData(
  data: Record<string, string | number | object> | undefined,
  deps: TaskDeadlineNotificationPressDeps,
): void {
  const payload = extractTaskDeadlinePressData(data);
  if (!payload) return;

  const record = useRecordStore.getState().records.find((item) => item.id === payload.recordId);
  if (record) {
    deps.navigateToRecord(payload.recordId);
    return;
  }

  deps.navigateToAllTasks();
}

export function handleTaskDeadlineNotificationPress(
  event: Event,
  deps: TaskDeadlineNotificationPressDeps,
): void {
  if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;
  handleTaskDeadlineNotificationData(event.detail.notification?.data, deps);
}

export function createTaskDeadlineNotificationPressHandler(
  deps: TaskDeadlineNotificationPressDeps,
): (event: Event) => void {
  return (event) => {
    handleTaskDeadlineNotificationPress(event, deps);
  };
}
