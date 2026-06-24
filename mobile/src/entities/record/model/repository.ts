import dayjs from 'dayjs';
import { and, desc, eq, inArray, isNotNull, isNull, lt, lte, ne } from 'drizzle-orm';

import { sanitizeMeetingSpeakerLabels } from '@/screens/recording-detail/lib/meetingSpeakerLabels';
import {
  audioPathFromDbValue,
  audioPathToDbValue,
  getDB,
  getRecordingsRelativePath,
  isRecord,
  recordAskAiTable,
  recordsTable,
} from '@/shared/lib';
import { devWarn } from '@/shared/lib/appLogger';
import type { RecordForStats } from '@/shared/lib/async-storage/storage';
import { isString } from '@/shared/lib/type-guards';

import { sanitizeRecordingMark } from './normalizeRecordingMark';
import { TRASH_RETENTION_DAYS } from './trashConfig';
import type {
  MeetingSummaryTemplate,
  RecordClassification,
  RecordHeavyFields,
  RecordingMark,
  RecordingStatus,
  RecordListItem,
  TaskItem,
  TranscriptSegment,
  VoiceRecord,
} from './types';

function parseSummaryAiModelMode(
  raw: string | null | undefined,
): VoiceRecord['summaryAiModelMode'] {
  const value = raw?.trim();
  return value === 'auto' || value === 'manual' ? value : undefined;
}

function parseMeetingSpeakerLabelsJson(raw: string | null | undefined) {
  try {
    return sanitizeMeetingSpeakerLabels(JSON.parse(raw ?? 'null') as unknown);
  } catch {
    return undefined;
  }
}

function parseLinkedRecordIds(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw ?? '[]') as unknown;
    if (!Array.isArray(v)) return [];
    const out: string[] = [];
    for (const item of v) {
      if (!isString(item)) continue;
      const trimmed = item.trim();
      if (!trimmed || out.includes(trimmed)) continue;
      out.push(trimmed);
      if (out.length >= 200) break;
    }
    return out;
  } catch {
    return [];
  }
}

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

const MEETING_SUMMARY_TEMPLATES: readonly MeetingSummaryTemplate[] = [
  'general',
  'standup',
  'sales_call',
  'one_on_one',
  'interview',
  'product_meeting',
  'lecture',
];

function sanitizeMeetingSummaryTemplate(
  raw: string | null | undefined,
): MeetingSummaryTemplate | undefined {
  return isString(raw) && MEETING_SUMMARY_TEMPLATES.includes(raw as MeetingSummaryTemplate)
    ? (raw as MeetingSummaryTemplate)
    : undefined;
}

const logDb = (op: string, details?: Record<string, unknown>) => {
  devWarn(`[db] ${op}`, details ?? '');
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
  meetingSpeakerLabels: string | null;
  meetingSummaryTemplate: string | null;
  cloudAiJobId: string | null;
  summaryReasoning: string | null;
  summaryAiModel: string | null;
  summaryAiModelLabel: string | null;
  summaryAiModelMode: string | null;
  summaryTokensPrompt: number | null;
  summaryTokensCompletion: number | null;
  summaryGenerationMs: number | null;
  translatedTranscript: string | null;
  translationLanguage: string | null;
  audioPath: string | null;
  folderId: string | null;
  recordingMarks: string | null;
  linkedRecordIds: string | null;
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
    meetingSpeakerLabels: parseMeetingSpeakerLabelsJson(row.meetingSpeakerLabels),
    meetingSummaryTemplate: sanitizeMeetingSummaryTemplate(row.meetingSummaryTemplate),
    cloudAiJobId: row.cloudAiJobId?.trim() ? row.cloudAiJobId.trim() : undefined,
    summaryReasoning: row.summaryReasoning?.trim() ? row.summaryReasoning.trim() : undefined,
    summaryAiModel: row.summaryAiModel?.trim() ? row.summaryAiModel.trim() : undefined,
    summaryAiModelLabel: row.summaryAiModelLabel?.trim()
      ? row.summaryAiModelLabel.trim()
      : undefined,
    summaryAiModelMode: parseSummaryAiModelMode(row.summaryAiModelMode),
    summaryTokensPrompt:
      row.summaryTokensPrompt != null && row.summaryTokensPrompt >= 0
        ? row.summaryTokensPrompt
        : undefined,
    summaryTokensCompletion:
      row.summaryTokensCompletion != null && row.summaryTokensCompletion >= 0
        ? row.summaryTokensCompletion
        : undefined,
    summaryGenerationMs:
      row.summaryGenerationMs != null && row.summaryGenerationMs > 0
        ? row.summaryGenerationMs
        : undefined,
    translatedTranscript: row.translatedTranscript ?? undefined,
    translationLanguage: row.translationLanguage ?? undefined,
    translationStatus: row.translatedTranscript
      ? ('done' as RecordingStatus)
      : ('idle' as RecordingStatus),
    audioPath: audioPathFromDbValue(row.audioPath),
    embedding: row.embedding ? (JSON.parse(row.embedding) as number[]) : undefined,
    folderId: row.folderId ?? null,
    linkedRecordIds: (() => {
      const ids = parseLinkedRecordIds(row.linkedRecordIds);
      return ids.length > 0 ? ids : undefined;
    })(),
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
    meetingDialogueStatus: row.meetingDialogue?.trim() ? ('done' as const) : undefined,
    meetingSpeakerLabels: parseMeetingSpeakerLabelsJson(row.meetingSpeakerLabels),
    meetingSummaryTemplate: sanitizeMeetingSummaryTemplate(row.meetingSummaryTemplate),
    cloudAiJobId: row.cloudAiJobId?.trim() ? row.cloudAiJobId.trim() : undefined,
    summaryReasoning: row.summaryReasoning?.trim() ? row.summaryReasoning.trim() : undefined,
    summaryAiModel: row.summaryAiModel?.trim() ? row.summaryAiModel.trim() : undefined,
    summaryAiModelLabel: row.summaryAiModelLabel?.trim()
      ? row.summaryAiModelLabel.trim()
      : undefined,
    summaryAiModelMode: parseSummaryAiModelMode(row.summaryAiModelMode),
    summaryTokensPrompt:
      row.summaryTokensPrompt != null && row.summaryTokensPrompt >= 0
        ? row.summaryTokensPrompt
        : undefined,
    summaryTokensCompletion:
      row.summaryTokensCompletion != null && row.summaryTokensCompletion >= 0
        ? row.summaryTokensCompletion
        : undefined,
    summaryGenerationMs:
      row.summaryGenerationMs != null && row.summaryGenerationMs > 0
        ? row.summaryGenerationMs
        : undefined,
    translatedTranscript: row.translatedTranscript ?? undefined,
    translationLanguage: row.translationLanguage ?? undefined,
    translationStatus: row.translatedTranscript
      ? ('done' as RecordingStatus)
      : ('idle' as RecordingStatus),
    audioPath: audioPathFromDbValue(row.audioPath),
    folderId: row.folderId ?? null,
    linkedRecordIds: (() => {
      const ids = parseLinkedRecordIds(row.linkedRecordIds);
      return ids.length > 0 ? ids : undefined;
    })(),
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
  meetingSpeakerLabels: recordsTable.meetingSpeakerLabels,
  meetingSummaryTemplate: recordsTable.meetingSummaryTemplate,
  cloudAiJobId: recordsTable.cloudAiJobId,
  summaryReasoning: recordsTable.summaryReasoning,
  summaryAiModel: recordsTable.summaryAiModel,
  summaryAiModelLabel: recordsTable.summaryAiModelLabel,
  summaryAiModelMode: recordsTable.summaryAiModelMode,
  summaryTokensPrompt: recordsTable.summaryTokensPrompt,
  summaryTokensCompletion: recordsTable.summaryTokensCompletion,
  summaryGenerationMs: recordsTable.summaryGenerationMs,
  translatedTranscript: recordsTable.translatedTranscript,
  translationLanguage: recordsTable.translationLanguage,
  audioPath: recordsTable.audioPath,
  folderId: recordsTable.folderId,
  linkedRecordIds: recordsTable.linkedRecordIds,
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

  getEmbeddingsForActiveRecords: async (): Promise<Map<string, number[]>> => {
    logDb('getEmbeddingsForActiveRecords');
    const db = getDB();
    const rows = await db
      .select({ id: recordsTable.id, embedding: recordsTable.embedding })
      .from(recordsTable)
      .where(and(activeRecordsClause, isNotNull(recordsTable.embedding)));

    const out = new Map<string, number[]>();
    for (const row of rows) {
      if (!row.embedding) continue;
      try {
        const parsed = JSON.parse(row.embedding) as number[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          out.set(row.id, parsed);
        }
      } catch {
        continue;
      }
    }
    logDb('getEmbeddingsForActiveRecords', { count: out.size });
    return out;
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
        meetingSpeakerLabels: record.meetingSpeakerLabels
          ? JSON.stringify(record.meetingSpeakerLabels)
          : null,
        meetingSummaryTemplate: record.meetingSummaryTemplate ?? null,
        cloudAiJobId: record.cloudAiJobId?.trim() ? record.cloudAiJobId.trim() : null,
        summaryReasoning: record.summaryReasoning?.trim() ? record.summaryReasoning.trim() : null,
        summaryAiModel: record.summaryAiModel?.trim() ? record.summaryAiModel.trim() : null,
        summaryAiModelLabel: record.summaryAiModelLabel?.trim()
          ? record.summaryAiModelLabel.trim()
          : null,
        summaryTokensPrompt: record.summaryTokensPrompt ?? null,
        summaryTokensCompletion: record.summaryTokensCompletion ?? null,
        summaryGenerationMs: record.summaryGenerationMs ?? null,
        translatedTranscript: record.translatedTranscript ?? null,
        translationLanguage: record.translationLanguage ?? null,
        audioPath: audioPathToDbValue(record.audioPath),
        embedding: record.embedding ? JSON.stringify(record.embedding) : null,
        folderId: record.folderId ?? null,
        linkedRecordIds: JSON.stringify(record.linkedRecordIds ?? []),
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

  markAsUnread: async (id: string): Promise<void> => {
    logDb('markAsUnread', { id });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ status: 'unread', readAt: null })
      .where(eq(recordsTable.id, id));
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

  updateLinkedRecordIds: async (id: string, linkedRecordIds: string[]): Promise<void> => {
    logDb('updateLinkedRecordIds', { id, count: linkedRecordIds.length });
    const db = getDB();
    await db
      .update(recordsTable)
      .set({ linkedRecordIds: JSON.stringify(linkedRecordIds) })
      .where(eq(recordsTable.id, id));
  },

  pruneLinkedRecordReferences: async (deletedId: string): Promise<string[]> => {
    logDb('pruneLinkedRecordReferences', { deletedId });
    const db = getDB();
    const rows = await db
      .select({ id: recordsTable.id, linkedRecordIds: recordsTable.linkedRecordIds })
      .from(recordsTable)
      .where(activeRecordsClause);
    const updatedIds: string[] = [];

    for (const row of rows) {
      const ids = parseLinkedRecordIds(row.linkedRecordIds);
      if (!ids.includes(deletedId)) continue;
      const next = ids.filter((linkedId) => linkedId !== deletedId);
      await db
        .update(recordsTable)
        .set({ linkedRecordIds: JSON.stringify(next) })
        .where(eq(recordsTable.id, row.id));
      updatedIds.push(row.id);
    }

    return updatedIds;
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
      meetingSpeakerLabels?: Record<string, string> | null;
      meetingSummaryTemplate?: MeetingSummaryTemplate | null;
      cloudAiJobId?: string | null;
      summaryReasoning?: string | null;
      summaryAiModel?: string | null;
      summaryAiModelLabel?: string | null;
      summaryAiModelMode?: 'manual' | 'auto' | null;
      summaryTokensPrompt?: number | null;
      summaryTokensCompletion?: number | null;
      summaryGenerationMs?: number | null;
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
    if (data.meetingSpeakerLabels !== undefined) {
      updates.meetingSpeakerLabels =
        data.meetingSpeakerLabels && Object.keys(data.meetingSpeakerLabels).length > 0
          ? JSON.stringify(data.meetingSpeakerLabels)
          : null;
    }
    if (data.meetingSummaryTemplate !== undefined) {
      updates.meetingSummaryTemplate = data.meetingSummaryTemplate ?? null;
    }
    if (data.cloudAiJobId !== undefined) {
      updates.cloudAiJobId = data.cloudAiJobId?.trim() ? data.cloudAiJobId.trim() : null;
    }
    if (data.summaryReasoning !== undefined) {
      updates.summaryReasoning = data.summaryReasoning?.trim()
        ? data.summaryReasoning.trim()
        : null;
    }
    if (data.summaryAiModel !== undefined) {
      updates.summaryAiModel = data.summaryAiModel?.trim() ? data.summaryAiModel.trim() : null;
    }
    if (data.summaryAiModelLabel !== undefined) {
      updates.summaryAiModelLabel = data.summaryAiModelLabel?.trim()
        ? data.summaryAiModelLabel.trim()
        : null;
    }
    if (data.summaryAiModelMode !== undefined) {
      updates.summaryAiModelMode =
        data.summaryAiModelMode === 'auto' || data.summaryAiModelMode === 'manual'
          ? data.summaryAiModelMode
          : null;
    }
    if (data.summaryTokensPrompt !== undefined) {
      updates.summaryTokensPrompt = data.summaryTokensPrompt;
    }
    if (data.summaryTokensCompletion !== undefined) {
      updates.summaryTokensCompletion = data.summaryTokensCompletion;
    }
    if (data.summaryGenerationMs !== undefined) {
      updates.summaryGenerationMs = data.summaryGenerationMs;
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
