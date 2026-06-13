import type { VoiceRecord } from '../model/types';

export function isMeetingRecord(record: Pick<VoiceRecord, 'classification'>): boolean {
  return record.classification === 'meeting';
}
