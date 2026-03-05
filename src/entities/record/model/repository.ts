import { getDB } from '@/shared/lib';

import type { VoiceRecord } from './types';

type RawRow = {
  id: string;
  title: string;
  transcript: string;
  duration: string;
  createdAt: string;
  status: string;
  isPinned: number;
  tags: string;
};

const toRecord = (row: RawRow): VoiceRecord => ({
  id: row.id,
  title: row.title,
  transcript: row.transcript,
  duration: row.duration,
  createdAt: row.createdAt,
  status: row.status as VoiceRecord['status'],
  isPinned: Boolean(row.isPinned),
  tags: JSON.parse(row.tags) as string[],
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
        (id, title, transcript, duration, createdAt, status, isPinned, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.title,
        record.transcript,
        record.duration,
        record.createdAt,
        record.status,
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
