import { useRecordStore } from '@/entities/record';
import {
  createTranscriptionPausedNotificationPressHandler,
  handleTranscriptionPausedNotificationData,
} from '@/features/transcription/lib/paused-notification/handleTranscriptionPausedNotificationPress';
import { requestTranscriptionResumePrompt } from '@/features/transcription/model/transcriptionResumePromptRequest';

import { navigationRef } from '../navigation/navigationRef';

const transcriptionPausedNotificationPressDeps = {
  onOpenPausedTranscription: (recordId: string) => {
    requestTranscriptionResumePrompt(recordId);

    if (!navigationRef.isReady()) return;

    const record = useRecordStore.getState().records.find((item) => item.id === recordId);
    if (record?.audioPath) {
      navigationRef.navigate('RecordingDetail', { record });
    }
  },
};

export const handleTranscriptionPausedNotificationPress =
  createTranscriptionPausedNotificationPressHandler(transcriptionPausedNotificationPressDeps);

export function openTranscriptionPausedNotification(
  data: Record<string, string | number | object> | undefined,
): void {
  handleTranscriptionPausedNotificationData(data, transcriptionPausedNotificationPressDeps);
}
