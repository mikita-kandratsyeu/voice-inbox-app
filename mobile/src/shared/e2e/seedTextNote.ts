import dayjs from 'dayjs';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record/model/store';

import { isE2EAllowed } from './isE2EAllowed';

export const E2E_SEED_RECORD_ID = 'e2e-seed-note';

export type SeedTextNoteParams = {
  title?: string;
  body?: string;
  id?: string;
};

export async function seedTextNoteForE2E(params: SeedTextNoteParams = {}): Promise<VoiceRecord> {
  if (!isE2EAllowed()) {
    throw new Error('E2E seed is only available in dev/internal builds');
  }

  const title = (params.title ?? 'E2E Note').trim() || 'E2E Note';
  const transcript = (params.body ?? 'Seeded by Maestro E2E.').trim() || 'Seeded by Maestro E2E.';
  const id = params.id ?? E2E_SEED_RECORD_ID;

  const record: VoiceRecord = {
    id,
    title,
    transcript,
    transcriptSegments: [],
    summary: '',
    tasks: [],
    duration: '00:00',
    durationMs: 0,
    createdAt: dayjs().toISOString(),
    status: 'unread',
    aiStatus: 'idle',
    transcriptProgress: 0,
    isPinned: false,
    tags: [],
    audioPath: '',
  };

  await useRecordStore.getState().addRecord(record);

  return record;
}
