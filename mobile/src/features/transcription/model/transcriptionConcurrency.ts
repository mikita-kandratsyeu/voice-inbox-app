import { useRecordStore, type VoiceRecord } from '@/entities/record';

import {
  hasActiveTranscriptionJob,
  hasAnyActiveTranscriptionJob,
} from './transcriptionJobRegistry';

const isRecordTranscribing = (record: Pick<VoiceRecord, 'aiStatus'>): boolean =>
  record.aiStatus === 'loading_model' || record.aiStatus === 'processing';

export function isTranscriptionBlockedForRecord(
  recordId: string,
  records: Pick<VoiceRecord, 'id' | 'aiStatus'>[],
): boolean {
  if (records.some((r) => r.id !== recordId && isRecordTranscribing(r))) {
    return true;
  }

  return hasAnyActiveTranscriptionJob() && !hasActiveTranscriptionJob(recordId);
}

export function useTranscriptionBlockedForRecord(recordId: string): boolean {
  return useRecordStore((s) => isTranscriptionBlockedForRecord(recordId, s.records));
}
