import { desc, eq } from 'drizzle-orm';

import { getDB, recordsTable } from '@/shared/lib';

import type {
  RecordClassification,
  RecordingStatus,
  TaskItem,
  TranscriptSegment,
  VoiceRecord,
} from './types';

const logDb = (op: string, details?: Record<string, unknown>) => {
  if (__DEV__) {
    console.warn(`[db] ${op}`, details ?? '');
  }
};

type RecordRowRaw = {
  id: string;
  title: string;
  transcript: string | null;
  transcriptSegments: string | null;
  summary: string | null;
  tasks: string | null;
  duration: string | null;
  durationMs: number | null;
  createdAt: string | null;
  relativeTime: string | null;
  status: string | null;
  aiStatus: string | null;
  transcriptProgress: number | null;
  isPinned: number | null;
  tags: string | null;
  classification: string | null;
  keyPhrases: string | null;
  nextSteps: string | null;
  translatedTranscript: string | null;
  translationLanguage: string | null;
  audioPath: string | null;
  embedding: string | null;
};

const toRecord = (row: RecordRowRaw): VoiceRecord => {
  const summary = row.summary ?? '';
  const tasks = JSON.parse(row.tasks ?? '[]') as TaskItem[];
  return {
    id: row.id,
    title: row.title,
    transcript: row.transcript ?? '',
    transcriptSegments: JSON.parse(row.transcriptSegments ?? '[]') as TranscriptSegment[],
    summary,
    tasks,
    duration: row.duration ?? '0:00',
    durationMs: row.durationMs ?? 0,
    createdAt: row.createdAt ?? '',
    relativeTime: row.relativeTime ?? '',
    status: (row.status ?? 'unread') as VoiceRecord['status'],
    aiStatus: (row.aiStatus ?? 'idle') as RecordingStatus,
    transcriptProgress: row.transcriptProgress ?? 0,
    isPinned: Boolean(row.isPinned),
    tags: JSON.parse(row.tags ?? '[]') as string[],
    classification: (row.classification as VoiceRecord['classification']) ?? undefined,
    keyPhrases: JSON.parse(row.keyPhrases ?? '[]') as string[],
    nextSteps: JSON.parse(row.nextSteps ?? '[]') as string[],
    translatedTranscript: row.translatedTranscript ?? undefined,
    translationLanguage: row.translationLanguage ?? undefined,
    audioPath: row.audioPath ?? undefined,
    embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : undefined,
    summaryStatus: summary ? ('done' as RecordingStatus) : undefined,
    tasksStatus: tasks.length > 0 ? ('done' as RecordingStatus) : undefined,
  };
};

export const recordRepository = {
  getAll: async (): Promise<VoiceRecord[]> => {
    logDb('getAll');
    const db = getDB();
    const rows = await db
      .select()
      .from(recordsTable)
      .orderBy(desc(recordsTable.isPinned), desc(recordsTable.createdAt));
    logDb('getAll', { count: rows.length });
    return rows.map(toRecord);
  },

  insert: async (record: VoiceRecord): Promise<void> => {
    logDb('insert', { id: record.id, title: record.title });
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
        durationMs: record.durationMs ?? 0,
        createdAt: record.createdAt,
        relativeTime: record.relativeTime ?? '',
        status: record.status,
        aiStatus: record.aiStatus ?? 'idle',
        transcriptProgress: record.transcriptProgress ?? 0,
        isPinned: record.isPinned ? 1 : 0,
        tags: JSON.stringify(record.tags ?? []),
        classification: record.classification ?? null,
        keyPhrases: JSON.stringify(record.keyPhrases ?? []),
        nextSteps: JSON.stringify(record.nextSteps ?? []),
        translatedTranscript: record.translatedTranscript ?? null,
        translationLanguage: record.translationLanguage ?? null,
        audioPath: record.audioPath ?? null,
        embedding: record.embedding ? JSON.stringify(record.embedding) : null,
      })
      .onConflictDoNothing();
  },

  remove: async (id: string): Promise<void> => {
    logDb('remove', { id });
    const db = getDB();
    await db.delete(recordsTable).where(eq(recordsTable.id, id));
  },

  togglePin: async (id: string, isPinned: boolean): Promise<void> => {
    logDb('togglePin', { id, isPinned });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ isPinned: isPinned ? 1 : 0 })
      .where(eq(recordsTable.id, id));
  },

  markAsRead: async (id: string): Promise<void> => {
    logDb('markAsRead', { id });
    const db = getDB();
    await db.update(recordsTable).set({ status: 'read' }).where(eq(recordsTable.id, id));
  },

  archive: async (id: string): Promise<void> => {
    logDb('archive', { id });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ status: 'archived', isPinned: 0 })
      .where(eq(recordsTable.id, id));
  },

  unarchive: async (id: string): Promise<void> => {
    logDb('unarchive', { id });
    const db = getDB();
    await db.update(recordsTable).set({ status: 'unread' }).where(eq(recordsTable.id, id));
  },

  rename: async (id: string, title: string): Promise<void> => {
    logDb('rename', { id, title });
    const db = getDB();
    await db.update(recordsTable).set({ title }).where(eq(recordsTable.id, id));
  },

  updateTranscript: async (
    id: string,
    transcript: string,
    segments: TranscriptSegment[],
  ): Promise<void> => {
    logDb('updateTranscript', { id, segmentsCount: segments.length });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({
        transcript,
        transcriptSegments: JSON.stringify(segments),
        aiStatus: 'done',
        transcriptProgress: 100,
      })
      .where(eq(recordsTable.id, id));
  },

  updateSummary: async (id: string, summary: string): Promise<void> => {
    logDb('updateSummary', { id });
    const db = getDB();
    await db.update(recordsTable).set({ summary }).where(eq(recordsTable.id, id));
  },

  updateTasks: async (id: string, tasks: TaskItem[]): Promise<void> => {
    logDb('updateTasks', { id, count: tasks.length });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ tasks: JSON.stringify(tasks) })
      .where(eq(recordsTable.id, id));
  },

  updateTags: async (id: string, tags: string[]): Promise<void> => {
    logDb('updateTags', { id, count: tags.length });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ tags: JSON.stringify(tags) })
      .where(eq(recordsTable.id, id));
  },

  updateAiExtras: async (
    id: string,
    data: {
      classification?: RecordClassification | null;
      keyPhrases?: string[];
      nextSteps?: string[];
    },
  ): Promise<void> => {
    logDb('updateAiExtras', { id });
    const db = getDB();
    const updates: Record<string, unknown> = {};
    if (data.classification !== undefined) {
      updates.classification = data.classification ?? null;
    }
    if (data.keyPhrases !== undefined) {
      updates.keyPhrases = JSON.stringify(data.keyPhrases);
    }
    if (data.nextSteps !== undefined) {
      updates.nextSteps = JSON.stringify(data.nextSteps);
    }
    if (Object.keys(updates).length > 0) {
      await db.update(recordsTable).set(updates).where(eq(recordsTable.id, id));
    }
  },

  updateTranslation: async (
    id: string,
    translatedTranscript: string | null,
    translationLanguage: string | null,
  ): Promise<void> => {
    logDb('updateTranslation', { id });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({
        translatedTranscript,
        translationLanguage,
      })
      .where(eq(recordsTable.id, id));
  },

  clearAudioPath: async (id: string): Promise<void> => {
    logDb('clearAudioPath', { id });
    const db = getDB();
    await db.update(recordsTable).set({ audioPath: null }).where(eq(recordsTable.id, id));
  },

  updateEmbedding: async (id: string, embedding: number[] | null): Promise<void> => {
    logDb('updateEmbedding', { id });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ embedding: embedding ? JSON.stringify(embedding) : null })
      .where(eq(recordsTable.id, id));
  },
};
