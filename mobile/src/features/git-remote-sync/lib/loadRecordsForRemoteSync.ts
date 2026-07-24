import type { VoiceRecord } from '@/entities/record';
import { recordRepository } from '@/entities/record/model/repository';

/** Full active records from SQLite (includes transcriptSegments, unlike inbox list cache). */
export async function loadRecordsForRemoteSync(): Promise<VoiceRecord[]> {
  return recordRepository.getAll();
}
