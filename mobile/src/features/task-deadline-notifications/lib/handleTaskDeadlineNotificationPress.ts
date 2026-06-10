import type { Event } from '@notifee/react-native';
import { EventType } from '@notifee/react-native';

import { useRecordStore } from '@/entities/record';

import { TASK_DEADLINE_PRESS_OPEN } from './constants';
import { executeTaskDeadlineNotificationAction } from './executeTaskDeadlineNotificationAction';
import {
  extractTaskDeadlineNotificationIds,
  resolveTaskDeadlineSheetPayload,
  type TaskDeadlineSheetPayload,
} from './resolveTaskDeadlineSheetPayload';

export type TaskDeadlineNotificationPressDeps = {
  navigateToRecord: (recordId: string) => void;
  navigateToAllTasks: () => void;
  openActionSheet: (payload: TaskDeadlineSheetPayload) => void;
};

export function handleTaskDeadlineNotificationData(
  data: Record<string, string | number | object> | undefined,
  deps: TaskDeadlineNotificationPressDeps,
): void {
  const payload = resolveTaskDeadlineSheetPayload(data, (recordId) =>
    useRecordStore.getState().records.find((item) => item.id === recordId),
  );
  if (!payload) {
    const ids = extractTaskDeadlineNotificationIds(data);
    if (ids) {
      deps.navigateToAllTasks();
    }
    return;
  }

  deps.openActionSheet(payload);
}

export function handleTaskDeadlineNotificationPress(
  event: Event,
  deps: TaskDeadlineNotificationPressDeps,
): void {
  if (event.type !== EventType.PRESS && event.type !== EventType.ACTION_PRESS) return;

  const data = event.detail.notification?.data;
  const actionId = event.detail.pressAction?.id;

  if (event.type === EventType.ACTION_PRESS && actionId && actionId !== TASK_DEADLINE_PRESS_OPEN) {
    void executeTaskDeadlineNotificationAction(actionId, data, deps);
    return;
  }

  handleTaskDeadlineNotificationData(data, deps);
}

export function createTaskDeadlineNotificationPressHandler(
  deps: TaskDeadlineNotificationPressDeps,
): (event: Event) => void {
  return (event) => {
    handleTaskDeadlineNotificationPress(event, deps);
  };
}
