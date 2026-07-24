import type { VoiceRecord } from '@/entities/record';

import { isTranscriptionBlockedForRecord } from '../model/transcriptionConcurrency';
import { isTooShortForTranscription } from './transcriptionDuration';

export type AutoTranscriptionScheduleResult = 'started' | 'too_short' | 'blocked';

export function tryScheduleAutoTranscription(
  record: Pick<VoiceRecord, 'id' | 'durationMs'>,
  records: Pick<VoiceRecord, 'id' | 'aiStatus'>[],
  start: (record: VoiceRecord) => void,
  recordForStart: VoiceRecord,
): AutoTranscriptionScheduleResult {
  if (isTooShortForTranscription(record.durationMs)) {
    return 'too_short';
  }

  if (isTranscriptionBlockedForRecord(record.id, records)) {
    return 'blocked';
  }

  start(recordForStart);
  return 'started';
}
