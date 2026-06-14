import type { VoiceRecord } from '@/entities/record';

type LinkSource = Pick<VoiceRecord, 'id' | 'linkedRecordIds'>;

export function buildBacklinkRecordIds(recordId: string, records: readonly LinkSource[]): string[] {
  const out: string[] = [];

  for (const record of records) {
    if (record.id === recordId) continue;
    if (!(record.linkedRecordIds ?? []).includes(recordId)) continue;
    out.push(record.id);
  }

  return out;
}
