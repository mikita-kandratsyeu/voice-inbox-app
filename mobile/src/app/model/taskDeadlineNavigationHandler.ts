import { useRecordStore } from '@/entities/record';
import {
  createTaskDeadlineNotificationPressHandler,
  handleTaskDeadlineNotificationData,
} from '@/features/task-deadline-notifications';

import { navigationRef } from '../navigation/navigationRef';

const taskDeadlineNotificationPressDeps = {
  navigateToRecord: (recordId: string) => {
    if (!navigationRef.isReady()) return;

    const record = useRecordStore.getState().records.find((item) => item.id === recordId);
    if (record) {
      navigationRef.navigate('RecordingDetail', { record });
      return;
    }

    navigationRef.navigate('Main');
  },
  navigateToAllTasks: () => {
    if (!navigationRef.isReady()) return;
    navigationRef.navigate('AllTasks');
  },
};

export const handleTaskDeadlineNotificationPress = createTaskDeadlineNotificationPressHandler(
  taskDeadlineNotificationPressDeps,
);

export function openTaskDeadlineNotification(
  data: Record<string, string | number | object> | undefined,
): void {
  handleTaskDeadlineNotificationData(data, taskDeadlineNotificationPressDeps);
}
