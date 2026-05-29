import { useRecordStore } from '@/entities/record';

import { getTranscriptionCheckpoint } from '../transcriptionCheckpoint';
import { notifyTranscriptionPaused } from './notifyTranscriptionPaused';

/** Shows a local notification when there is checkpoint progress to resume. */
export function schedulePausedNotificationIfResumable(recordId: string): void {
  void (async () => {
    const checkpoint = await getTranscriptionCheckpoint(recordId);
    if (!checkpoint) return;

    const record = useRecordStore.getState().records.find((r) => r.id === recordId);
    if (!record?.audioPath) return;

    await notifyTranscriptionPaused({ recordId, recordTitle: record.title });
  })();
}
