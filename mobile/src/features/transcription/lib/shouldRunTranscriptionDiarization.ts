import type { VoiceRecord } from '@/entities/record';

/** Pro-only. Meeting notes always get voice labels on iOS WhisperKit; the setting enables them for every record. */
export function shouldRunTranscriptionDiarization(
  record: Pick<VoiceRecord, 'classification'>,
  diarizeAllRecordings: boolean,
  isProActive: boolean,
): boolean {
  if (!isProActive) {
    return false;
  }
  return diarizeAllRecordings || record.classification === 'meeting';
}
