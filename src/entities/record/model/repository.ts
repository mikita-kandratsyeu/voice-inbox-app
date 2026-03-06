import { getDB } from '@/shared/lib';

import type { RecordingStatus, TaskItem, TranscriptSegment, VoiceRecord } from './types';

type RawRow = {
  id: string;
  title: string;
  transcript: string;
  transcriptSegments: string;
  summary: string;
  tasks: string;
  duration: string;
  createdAt: string;
  relativeTime: string;
  status: string;
  aiStatus: string;
  transcriptProgress: number;
  isPinned: number;
  tags: string;
};

const toRecord = (row: RawRow): VoiceRecord => ({
  id: row.id,
  title: row.title,
  transcript: row.transcript,
  transcriptSegments: JSON.parse(row.transcriptSegments ?? '[]') as TranscriptSegment[],
  summary: row.summary ?? '',
  tasks: JSON.parse(row.tasks ?? '[]') as TaskItem[],
  duration: row.duration,
  createdAt: row.createdAt,
  relativeTime: row.relativeTime ?? '',
  status: row.status as VoiceRecord['status'],
  aiStatus: (row.aiStatus ?? 'idle') as RecordingStatus,
  transcriptProgress: row.transcriptProgress ?? 0,
  isPinned: Boolean(row.isPinned),
  tags: JSON.parse(row.tags ?? '[]') as string[],
});

export const recordRepository = {
  getAll: (): VoiceRecord[] => {
    const result = getDB().executeSync(
      'SELECT * FROM records ORDER BY isPinned DESC, createdAt DESC',
    );
    return (result.rows as RawRow[]).map(toRecord);
  },

  insert: (record: VoiceRecord): void => {
    getDB().executeSync(
      `INSERT OR IGNORE INTO records
        (id, title, transcript, transcriptSegments, summary, tasks,
         duration, createdAt, relativeTime, status, aiStatus, transcriptProgress,
         isPinned, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.transcript,
        JSON.stringify(record.transcriptSegments ?? []),
        record.summary ?? '',
        JSON.stringify(record.tasks ?? []),
        record.duration,
        record.createdAt,
        record.relativeTime ?? '',
        record.status,
        record.aiStatus ?? 'idle',
        record.transcriptProgress ?? 0,
        record.isPinned ? 1 : 0,
        JSON.stringify(record.tags ?? []),
      ],
    );
  },

  remove: (id: string): void => {
    getDB().executeSync('DELETE FROM records WHERE id = ?', [id]);
  },

  togglePin: (id: string, isPinned: boolean): void => {
    getDB().executeSync('UPDATE records SET isPinned = ? WHERE id = ?', [isPinned ? 1 : 0, id]);
  },

  markAsRead: (id: string): void => {
    getDB().executeSync("UPDATE records SET status = 'read' WHERE id = ?", [id]);
  },
};
