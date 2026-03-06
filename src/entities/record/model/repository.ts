import { desc, eq } from 'drizzle-orm';

import { getDB, recordsTable } from '@/shared/lib';

import type { RecordingStatus, TaskItem, TranscriptSegment, VoiceRecord } from './types';

type RecordRowRaw = {
  id: string;
  title: string;
  transcript: string | null;
  transcriptSegments: string | null;
  summary: string | null;
  tasks: string | null;
  duration: string | null;
  createdAt: string | null;
  relativeTime: string | null;
  status: string | null;
  aiStatus: string | null;
  transcriptProgress: number | null;
  isPinned: number | null;
  tags: string | null;
  audioPath: string | null;
};

const toRecord = (row: RecordRowRaw): VoiceRecord => ({
  id: row.id,
  title: row.title,
  transcript: row.transcript ?? '',
  transcriptSegments: JSON.parse(row.transcriptSegments ?? '[]') as TranscriptSegment[],
  summary: row.summary ?? '',
  tasks: JSON.parse(row.tasks ?? '[]') as TaskItem[],
  duration: row.duration ?? '0:00',
  createdAt: row.createdAt ?? '',
  relativeTime: row.relativeTime ?? '',
  status: (row.status ?? 'unread') as VoiceRecord['status'],
  aiStatus: (row.aiStatus ?? 'idle') as RecordingStatus,
  transcriptProgress: row.transcriptProgress ?? 0,
  isPinned: Boolean(row.isPinned),
  tags: JSON.parse(row.tags ?? '[]') as string[],
  audioPath: row.audioPath ?? undefined,
});

export const recordRepository = {
  getAll: async (): Promise<VoiceRecord[]> => {
    const db = getDB();
    const rows = await db
      .select()
      .from(recordsTable)
      .orderBy(desc(recordsTable.isPinned), desc(recordsTable.createdAt));
    return rows.map(toRecord);
  },

  insert: async (record: VoiceRecord): Promise<void> => {
    const db = getDB();
    await db
      .insert(recordsTable)
      .values({
        id: record.id,
        title: record.title,
        transcript: record.transcript,
        transcriptSegments: JSON.stringify(record.transcriptSegments ?? []),
        summary: record.summary ?? '',
        tasks: JSON.stringify(record.tasks ?? []),
        duration: record.duration,
        createdAt: record.createdAt,
        relativeTime: record.relativeTime ?? '',
        status: record.status,
        aiStatus: record.aiStatus ?? 'idle',
        transcriptProgress: record.transcriptProgress ?? 0,
        isPinned: record.isPinned ? 1 : 0,
        tags: JSON.stringify(record.tags ?? []),
        audioPath: record.audioPath ?? null,
      })
      .onConflictDoNothing();
  },

  remove: async (id: string): Promise<void> => {
    const db = getDB();
    await db.delete(recordsTable).where(eq(recordsTable.id, id));
  },

  togglePin: async (id: string, isPinned: boolean): Promise<void> => {
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ isPinned: isPinned ? 1 : 0 })
      .where(eq(recordsTable.id, id));
  },

  markAsRead: async (id: string): Promise<void> => {
    const db = getDB();
    await db.update(recordsTable).set({ status: 'read' }).where(eq(recordsTable.id, id));
  },
};
