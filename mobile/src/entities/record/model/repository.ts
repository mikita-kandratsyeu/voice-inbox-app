import dayjs from 'dayjs';
import { and, desc, eq, inArray, isNotNull, isNull, lt, lte, ne } from 'drizzle-orm';

import {
  audioPathFromDbValue,
  audioPathToDbValue,
  getDB,
  getRecordingsRelativePath,
  isRecord,
  recordAskAiTable,
  recordsTable,
} from '@/shared/lib';
import type { RecordForStats } from '@/shared/lib/async-storage/storage';

import { sanitizeRecordingMark } from './normalizeRecordingMark';
import { TRASH_RETENTION_DAYS } from './trashConfig';
import type {
  RecordClassification,
  RecordHeavyFields,
  RecordingMark,
  RecordingStatus,
  RecordListItem,
  TaskItem,
  TranscriptSegment,
  VoiceRecord,
} from './types';

function parseRecordingMarks(raw: string | null | undefined): RecordingMark[] {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    if (!Array.isArray(v)) return [];
    const out: RecordingMark[] = [];
    for (let i = 0; i < v.length; i++) {
      const mark = sanitizeRecordingMark(v[i], i);
      if (mark) out.push(mark);
    }
    return out.slice(0, 400);
  } catch {
    return [];
  }
}

const logDb = (op: string, details?: Record<string, unknown>) => {
  if (__DEV__) {
    console.warn(`[db] ${op}`, details ?? '');
  }
};

function tasksJsonAllComplete(tasksJson: string | null | undefined): boolean {
  try {
    const parsed = JSON.parse(tasksJson ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return true;
    return !parsed.some((item) => isRecord(item) && (item as TaskItem).isDone !== true);
  } catch {
    return false;
  }
}

type RecordListQueryRow = {
  id: string;
  title: string;
  transcript: string | null;
  summary: string | null;
  tasks: string | null;
  duration: string | null;
  durationMs: number | null;
  createdAt: string | null;
  relativeTime: string | null;
  status: string | null;
  readAt: string | null;
  aiStatus: string | null;
  transcriptProgress: number | null;
  isPinned: number | null;
  tags: string | null;
  classification: string | null;
  keyPhrases: string | null;
  nextSteps: string | null;
  meetingDialogue: string | null;
  translatedTranscript: string | null;
  translationLanguage: string | null;
  audioPath: string | null;
  folderId: string | null;
  recordingMarks: string | null;
};

type RecordRowRaw = RecordListQueryRow & {
  transcriptSegments: string | null;
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
    readAt: row.readAt?.trim() ? row.readAt : null,
    aiStatus: (row.aiStatus ?? 'idle') as RecordingStatus,
    transcriptProgress: row.transcriptProgress ?? 0,
    isPinned: Boolean(row.isPinned),
    tags: JSON.parse(row.tags ?? '[]') as string[],
    recordingMarks: parseRecordingMarks(row.recordingMarks),
    classification: (row.classification as VoiceRecord['classification']) ?? undefined,
    keyPhrases: JSON.parse(row.keyPhrases ?? '[]') as string[],
    nextSteps: JSON.parse(row.nextSteps ?? '[]') as string[],
    meetingDialogue: row.meetingDialogue?.trim() ? row.meetingDialogue.trim() : undefined,
    translatedTranscript: row.translatedTranscript ?? undefined,
    translationLanguage: row.translationLanguage ?? undefined,
    translationStatus: row.translatedTranscript
      ? ('done' as RecordingStatus)
      : ('idle' as RecordingStatus),
    audioPath: audioPathFromDbValue(row.audioPath),
    embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : undefined,
    folderId: row.folderId ?? null,
    summaryStatus: summary ? ('done' as RecordingStatus) : undefined,
    tasksStatus: tasks.length > 0 ? ('done' as RecordingStatus) : undefined,
  };
};

const toRecordListItem = (row: RecordListQueryRow): RecordListItem => {
  const summary = row.summary ?? '';
  const tasks = JSON.parse(row.tasks ?? '[]') as TaskItem[];

  return {
    id: row.id,
    title: row.title,
    transcript: row.transcript ?? '',
    summary,
    tasks,
    duration: row.duration ?? '0:00',
    durationMs: row.durationMs ?? 0,
    createdAt: row.createdAt ?? '',
    relativeTime: row.relativeTime ?? '',
    status: (row.status ?? 'unread') as VoiceRecord['status'],
    readAt: row.readAt?.trim() ? row.readAt : null,
    aiStatus: (row.aiStatus ?? 'idle') as RecordingStatus,
    transcriptProgress: row.transcriptProgress ?? 0,
    isPinned: Boolean(row.isPinned),
    tags: JSON.parse(row.tags ?? '[]') as string[],
    recordingMarks: parseRecordingMarks(row.recordingMarks),
    classification: (row.classification as VoiceRecord['classification']) ?? undefined,
    keyPhrases: JSON.parse(row.keyPhrases ?? '[]') as string[],
    nextSteps: JSON.parse(row.nextSteps ?? '[]') as string[],
    meetingDialogue: row.meetingDialogue?.trim() ? row.meetingDialogue.trim() : undefined,
    translatedTranscript: row.translatedTranscript ?? undefined,
    translationLanguage: row.translationLanguage ?? undefined,
    translationStatus: row.translatedTranscript
      ? ('done' as RecordingStatus)
      : ('idle' as RecordingStatus),
    audioPath: audioPathFromDbValue(row.audioPath),
    folderId: row.folderId ?? null,
    detailsHydrated: false,
    summaryStatus: summary ? ('done' as RecordingStatus) : undefined,
    tasksStatus: tasks.length > 0 ? ('done' as RecordingStatus) : undefined,
  };
};

const recordListColumns = {
  id: recordsTable.id,
  title: recordsTable.title,
  transcript: recordsTable.transcript,
  summary: recordsTable.summary,
  tasks: recordsTable.tasks,
  duration: recordsTable.duration,
  durationMs: recordsTable.durationMs,
  createdAt: recordsTable.createdAt,
  relativeTime: recordsTable.relativeTime,
  status: recordsTable.status,
  readAt: recordsTable.readAt,
  aiStatus: recordsTable.aiStatus,
  transcriptProgress: recordsTable.transcriptProgress,
  isPinned: recordsTable.isPinned,
  tags: recordsTable.tags,
  recordingMarks: recordsTable.recordingMarks,
  classification: recordsTable.classification,
  keyPhrases: recordsTable.keyPhrases,
  nextSteps: recordsTable.nextSteps,
  meetingDialogue: recordsTable.meetingDialogue,
  translatedTranscript: recordsTable.translatedTranscript,
  translationLanguage: recordsTable.translationLanguage,
  audioPath: recordsTable.audioPath,
  folderId: recordsTable.folderId,
} as const;

const activeRecordsClause = isNull(recordsTable.deletedAt);

export type TrashedRecordListItem = RecordListItem & { purgeAt: string };

/** Trashed rows for storage stats (includes audio path for disk size). */
export type TrashedStoragePayload = RecordForStats & { audioPath?: string };

const parseJsonField = <T>(raw: string | null | undefined, fallback: T): T => {
  try {
    const v = JSON.parse(raw ?? 'null') as unknown;
    if (v === null || v === undefined) return fallback;
    return v as T;
  } catch {
    return fallback;
  }
};

export const recordRepository = {
  getAllList: async (): Promise<RecordListItem[]> => {
    logDb('getAllList');
    const db = getDB();
    const rows = await db
      .select(recordListColumns)
      .from(recordsTable)
      .where(activeRecordsClause)
      .orderBy(desc(recordsTable.isPinned), desc(recordsTable.createdAt));
    logDb('getAllList', { count: rows.length });

    for (const row of rows) {
      if (!row.audioPath) continue;
      const relative = getRecordingsRelativePath(row.audioPath);
      if (!relative) continue;
      if (row.audioPath === relative) continue;

      await db.update(recordsTable).set({ audioPath: relative }).where(eq(recordsTable.id, row.id));
    }

    return rows.map(toRecordListItem);
  },

  /** All record row ids (active + trash). Used so import does not treat trashed rows as “new”. */
  listAllRecordIds: async (): Promise<string[]> => {
    logDb('listAllRecordIds');
    const db = getDB();
    const rows = await db.select({ id: recordsTable.id }).from(recordsTable);
    logDb('listAllRecordIds', { count: rows.length });
    return rows.map((r) => r.id);
  },

  getAll: async (): Promise<VoiceRecord[]> => {
    logDb('getAll');
    const db = getDB();
    const rows = await db
      .select()
      .from(recordsTable)
      .where(activeRecordsClause)
      .orderBy(desc(recordsTable.isPinned), desc(recordsTable.createdAt));
    logDb('getAll', { count: rows.length });

    for (const row of rows) {
      if (!row.audioPath) continue;
      const relative = getRecordingsRelativePath(row.audioPath);
      if (!relative) continue;
      if (row.audioPath === relative) continue;

      await db.update(recordsTable).set({ audioPath: relative }).where(eq(recordsTable.id, row.id));
    }

    return rows.map(toRecord);
  },

  getHeavyFields: async (id: string): Promise<RecordHeavyFields> => {
    logDb('getHeavyFields', { id });
    const db = getDB();
    const rows = await db
      .select({
        transcriptSegments: recordsTable.transcriptSegments,
        embedding: recordsTable.embedding,
      })
      .from(recordsTable)
      .where(and(eq(recordsTable.id, id), activeRecordsClause))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { transcriptSegments: [], embedding: undefined };
    }

    return {
      transcriptSegments: JSON.parse(row.transcriptSegments ?? '[]') as TranscriptSegment[],
      embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : undefined,
    };
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
        readAt: record.readAt ?? null,
        aiStatus: record.aiStatus ?? 'idle',
        transcriptProgress: record.transcriptProgress ?? 0,
        isPinned: record.isPinned ? 1 : 0,
        tags: JSON.stringify(record.tags ?? []),
        recordingMarks: JSON.stringify(record.recordingMarks ?? []),
        classification: record.classification ?? null,
        keyPhrases: JSON.stringify(record.keyPhrases ?? []),
        nextSteps: JSON.stringify(record.nextSteps ?? []),
        meetingDialogue: record.meetingDialogue?.trim() ? record.meetingDialogue.trim() : null,
        translatedTranscript: record.translatedTranscript ?? null,
        translationLanguage: record.translationLanguage ?? null,
        audioPath: audioPathToDbValue(record.audioPath),
        embedding: record.embedding ? JSON.stringify(record.embedding) : null,
        folderId: record.folderId ?? null,
        deletedAt: null,
        purgeAt: null,
      })
      .onConflictDoNothing();
  },

  remove: async (id: string): Promise<void> => {
    logDb('remove', { id });
    const db = getDB();
    await db.delete(recordAskAiTable).where(eq(recordAskAiTable.recordId, id));
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

  markAsRead: async (id: string): Promise<string> => {
    logDb('markAsRead', { id });
    const readAt = dayjs().toISOString();
    const db = getDB();
    await db.update(recordsTable).set({ status: 'read', readAt }).where(eq(recordsTable.id, id));
    return readAt;
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
    await db
      .update(recordsTable)
      .set({ status: 'unread', readAt: null })
      .where(eq(recordsTable.id, id));
  },

  archiveReadRecordsOlderThan: async (isoThreshold: string): Promise<number> => {
    logDb('archiveReadRecordsOlderThan', { isoThreshold });
    const db = getDB();
    const staleClause = and(
      activeRecordsClause,
      eq(recordsTable.status, 'read'),
      eq(recordsTable.isPinned, 0),
      isNotNull(recordsTable.readAt),
      ne(recordsTable.readAt, ''),
      lt(recordsTable.readAt, isoThreshold),
    );
    const rows = await db
      .select({ id: recordsTable.id, tasks: recordsTable.tasks })
      .from(recordsTable)
      .where(staleClause);
    const ids = rows.filter((r) => tasksJsonAllComplete(r.tasks)).map((r) => r.id);
    if (ids.length === 0) return 0;
    await db
      .update(recordsTable)
      .set({ status: 'archived', isPinned: 0 })
      .where(inArray(recordsTable.id, ids));
    return ids.length;
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

  updateRecordingMarks: async (id: string, marks: RecordingMark[]): Promise<void> => {
    logDb('updateRecordingMarks', { id, count: marks.length });
    const sanitized = marks.slice(0, 400).map((m, i) => {
      const base = sanitizeRecordingMark(m, i, `rm_${Date.now()}_${i}`);
      return (
        base ?? { id: `rm_${Date.now()}_${i}`, offsetMs: 0, kind: 'moment' as const, label: '' }
      );
    });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ recordingMarks: JSON.stringify(sanitized) })
      .where(eq(recordsTable.id, id));
  },

  updateAiExtras: async (
    id: string,
    data: {
      classification?: RecordClassification | null;
      keyPhrases?: string[];
      nextSteps?: string[];
      meetingDialogue?: string | null;
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
    if (data.meetingDialogue !== undefined) {
      updates.meetingDialogue = data.meetingDialogue?.trim() ? data.meetingDialogue.trim() : null;
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

  persistAiState: async (
    id: string,
    aiStatus: RecordingStatus,
    transcriptProgress: number,
  ): Promise<void> => {
    logDb('persistAiState', { id, aiStatus, transcriptProgress });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ aiStatus, transcriptProgress })
      .where(eq(recordsTable.id, id));
  },

  updateEmbedding: async (id: string, embedding: number[] | null): Promise<void> => {
    logDb('updateEmbedding', { id });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ embedding: embedding ? JSON.stringify(embedding) : null })
      .where(eq(recordsTable.id, id));
  },

  peekAudioPathById: async (id: string): Promise<string | undefined> => {
    logDb('peekAudioPathById', { id });
    const db = getDB();
    const rows = await db
      .select({ audioPath: recordsTable.audioPath })
      .from(recordsTable)
      .where(eq(recordsTable.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    return audioPathFromDbValue(row.audioPath);
  },

  moveToTrash: async (id: string): Promise<void> => {
    logDb('moveToTrash', { id });
    const now = dayjs().toISOString();
    const purgeAt = dayjs().add(TRASH_RETENTION_DAYS, 'day').toISOString();
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ deletedAt: now, purgeAt })
      .where(and(eq(recordsTable.id, id), isNull(recordsTable.deletedAt)));
  },

  restoreFromTrash: async (id: string): Promise<void> => {
    logDb('restoreFromTrash', { id });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ deletedAt: null, purgeAt: null })
      .where(eq(recordsTable.id, id));
  },

  getTrashedList: async (): Promise<TrashedRecordListItem[]> => {
    logDb('getTrashedList');
    const db = getDB();
    const rows = await db
      .select({ ...recordListColumns, purgeAt: recordsTable.purgeAt })
      .from(recordsTable)
      .where(isNotNull(recordsTable.deletedAt))
      .orderBy(desc(recordsTable.deletedAt));
    return rows.map((row) => {
      const { purgeAt, ...rest } = row;
      return {
        ...toRecordListItem(rest as unknown as RecordListQueryRow),
        purgeAt: purgeAt ?? '',
      };
    });
  },

  getTrashedStoragePayloads: async (): Promise<TrashedStoragePayload[]> => {
    logDb('getTrashedStoragePayloads');
    const db = getDB();
    const rows = await db
      .select({
        transcript: recordsTable.transcript,
        transcriptSegments: recordsTable.transcriptSegments,
        summary: recordsTable.summary,
        tasks: recordsTable.tasks,
        audioPath: recordsTable.audioPath,
      })
      .from(recordsTable)
      .where(isNotNull(recordsTable.deletedAt));

    return rows.map(
      (row): TrashedStoragePayload => ({
        transcript: row.transcript ?? '',
        transcriptSegments: parseJsonField(row.transcriptSegments, []),
        summary: row.summary ?? '',
        tasks: parseJsonField(row.tasks, []),
        audioPath: audioPathFromDbValue(row.audioPath),
      }),
    );
  },

  listIdsReadyForPermanentPurge: async (): Promise<string[]> => {
    const db = getDB();
    const now = dayjs().toISOString();
    const rows = await db
      .select({ id: recordsTable.id })
      .from(recordsTable)
      .where(and(isNotNull(recordsTable.purgeAt), lte(recordsTable.purgeAt, now)));
    return rows.map((r) => r.id);
  },
};
