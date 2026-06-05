import { useRecordStore } from '@/entities/record';
import {
  createTranscriptionPausedNotificationPressHandler,
  handleTranscriptionPausedNotificationData,
} from '@/features/transcription';

import { navigationRef } from '../navigation/navigationRef';

const transcriptionPausedNotificationPressDeps = {
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

export const handleTranscriptionPausedNotificationPress =
  createTranscriptionPausedNotificationPressHandler(transcriptionPausedNotificationPressDeps);

export function openTranscriptionPausedNotification(
  data: Record<string, string | number | object> | undefined,
): void {
  handleTranscriptionPausedNotificationData(data, transcriptionPausedNotificationPressDeps);
}
