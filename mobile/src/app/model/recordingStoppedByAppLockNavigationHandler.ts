import { useRecordStore } from '@/entities/record';
import {
  createRecordingStoppedByAppLockNotificationPressHandler,
  handleRecordingStoppedByAppLockNotificationData,
} from '@/features/app-lock';

import { navigationRef } from '../navigation/navigationRef';

const recordingStoppedByAppLockNotificationPressDeps = {
  navigateToRecord: (recordId: string) => {
    if (!navigationRef.isReady()) return;

    const record = useRecordStore.getState().records.find((item) => item.id === recordId);
    if (record) {
      navigationRef.navigate('RecordingDetail', { record });
      return;
    }

    navigationRef.navigate('Main');
  },
};

export const handleRecordingStoppedByAppLockNotificationPress =
  createRecordingStoppedByAppLockNotificationPressHandler(
    recordingStoppedByAppLockNotificationPressDeps,
  );

export function openRecordingStoppedByAppLockNotification(
  data: Record<string, string | number | object> | undefined,
): void {
  handleRecordingStoppedByAppLockNotificationData(
    data,
    recordingStoppedByAppLockNotificationPressDeps,
  );
}
