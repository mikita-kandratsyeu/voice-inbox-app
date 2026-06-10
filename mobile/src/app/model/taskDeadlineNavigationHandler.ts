import { useRecordStore } from '@/entities/record';
import {
  createTaskDeadlineNotificationPressHandler,
  handleTaskDeadlineNotificationData,
  type TaskDeadlineSheetPayload,
} from '@/features/task-deadline-notifications';
import { useTaskDeadlineActionSheet } from '@/features/task-deadline-notifications/model/useTaskDeadlineActionSheet';

import { navigationRef } from '../navigation/navigationRef';

function navigateToRecord(recordId: string): void {
  if (!navigationRef.isReady()) return;

  const record = useRecordStore.getState().records.find((item) => item.id === recordId);
  if (record) {
    navigationRef.navigate('RecordingDetail', { record });
    return;
  }

  navigationRef.navigate('Main');
}

const taskDeadlineNotificationPressDeps = {
  navigateToRecord,
  navigateToAllTasks: () => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('AllTasks');
  },
  openActionSheet: (payload: TaskDeadlineSheetPayload) => {
    useTaskDeadlineActionSheet.getState().show(payload);
  },
};

export function openTaskDeadlineRecord(recordId: string): void {
  navigateToRecord(recordId);
}

export const handleTaskDeadlineNotificationPress = createTaskDeadlineNotificationPressHandler(
  taskDeadlineNotificationPressDeps,
);

export function openTaskDeadlineNotification(
  data: Record<string, string | number | object> | undefined,
): void {
  handleTaskDeadlineNotificationData(data, taskDeadlineNotificationPressDeps);
}
