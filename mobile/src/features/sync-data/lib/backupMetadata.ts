import dayjs from 'dayjs';
import { z } from 'zod';

import type { Folder } from '@/entities/folder';
import { DEFAULT_FOLDER_ICON_KEY } from '@/entities/folder/lib/folderLucideIcons';
import type {
  RecordClassification,
  RecordingMark,
  RecordStatus,
  TranscriptSegment,
  VoiceRecord,
} from '@/entities/record';
import { sanitizeRecordingMark } from '@/entities/record/model/normalizeRecordingMark';
import { sanitizeMeetingSpeakerLabels } from '@/screens/recording-detail/lib/meetingSpeakerLabels';
import { DEFAULT_FOLDER_BRAND_HEX } from '@/shared/lib/folderColor';
import { isArray, isNumber, isRecord, isString, isStringArrayItem } from '@/shared/lib/type-guards';

import { normalizeImportedTasks } from './normalizeImportedTasks';

const MAX_STRING_LENGTH = 100_000;
const MAX_ARRAY_LENGTH = 10_000;
const MAX_RECORDS_COUNT = 50_000;
const MAX_FOLDERS_COUNT = 1_000;

const safeString = z.string().max(MAX_STRING_LENGTH);
const safeOptionalString = safeString.optional().nullable();

const RecordClassificationSchema = z.enum(['personal', 'work', 'meeting', 'idea', 'other']);
const RecordStatusSchema = z.enum(['unread', 'read', 'archived']);
const MeetingSummaryTemplateSchema = z.enum([
  'general',
  'standup',
  'sales_call',
  'one_on_one',
  'interview',
  'product_meeting',
  'lecture',
]);

const TaskItemSchema = z.looseObject({
  id: safeString,
  text: safeString,
  isDone: z.boolean().optional(),
  deadline: safeOptionalString,
  deadlineTime: safeOptionalString,
  priority: z.enum(['high', 'medium', 'low']).optional(),
  source: z.enum(['manual', 'ai']).optional(),
});

const TranscriptSegmentSchema = z.looseObject({
  id: safeString,
  startTime: safeOptionalString,
  startMs: z.number().optional(),
  endMs: z.number().optional(),
  text: safeOptionalString,
});

const VoiceRecordSchema = z.looseObject({
  id: safeString,
  createdAt: safeString,
  updatedAt: safeOptionalString,
  title: safeOptionalString,
  transcript: safeOptionalString,
  transcriptSegments: z.array(TranscriptSegmentSchema).max(MAX_ARRAY_LENGTH).optional().nullable(),
  translatedTranscript: safeOptionalString,
  translationLanguage: safeOptionalString,
  summary: safeOptionalString,
  tasks: z.array(TaskItemSchema).max(MAX_ARRAY_LENGTH).optional().nullable(),
  classification: RecordClassificationSchema.optional().nullable(),
  keyPhrases: z.array(safeString).max(MAX_ARRAY_LENGTH).optional().nullable(),
  nextSteps: z.array(safeString).max(MAX_ARRAY_LENGTH).optional().nullable(),
  meetingDialogue: safeOptionalString,
  meetingSpeakerLabels: z.record(z.string(), z.string()).optional().nullable(),
  meetingSummaryTemplate: MeetingSummaryTemplateSchema.optional().nullable(),
  folderId: safeOptionalString,
  audioPath: safeOptionalString,
  duration: z
    .union([z.string().max(MAX_STRING_LENGTH), z.number()])
    .optional()
    .nullable(),
  durationMs: z.number().optional().nullable(),
  status: RecordStatusSchema.optional().nullable(),
  readAt: safeOptionalString,
  tags: z.array(safeString).max(MAX_ARRAY_LENGTH).optional().nullable(),
  isRead: z.boolean().optional().nullable(),
  isPinned: z.boolean().optional().nullable(),
  language: safeOptionalString,
  audioSize: z.nullish(z.number().min(0)),
  embedding: z.array(z.number()).max(MAX_ARRAY_LENGTH).optional().nullable(),
  summaryReasoning: safeOptionalString,
  summaryAiModel: safeOptionalString,
  summaryAiModelLabel: safeOptionalString,
  summaryTokensPrompt: z.number().optional().nullable(),
  summaryTokensCompletion: z.number().optional().nullable(),
  summaryGenerationMs: z.number().optional().nullable(),
  cloudAiJobId: safeOptionalString,
  recordingMarks: z
    .array(
      z.looseObject({
        id: safeString,
        offsetMs: z.number(),
        kind: safeOptionalString,
        label: safeString.optional(),
      }),
    )
    .max(500)
    .optional()
    .nullable(),
});

const FolderSchema = z.looseObject({
  id: safeString,
  name: safeString,
  color: safeOptionalString,
  icon: safeOptionalString,
  sortOrder: z.nullish(z.number()),
  createdAt: safeOptionalString,
});

const BasePayloadSchema = z.object({
  exportedAt: safeString,
});

const ExportPayloadV1Schema = BasePayloadSchema.extend({
  version: z.literal(1),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
});

const ExportPayloadV2Schema = BasePayloadSchema.extend({
  version: z.literal(2),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
});

const ExportPayloadV3Schema = BasePayloadSchema.extend({
  version: z.literal(3),
  folders: z.array(FolderSchema).max(MAX_FOLDERS_COUNT).optional(),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
});

const NotesGraphLayoutVersionSchema = z.looseObject({
  id: safeString,
  layoutKey: safeString,
  versionNumber: z.number().int().min(1),
  createdAt: safeString,
  payload: safeString,
});

const ExportPayloadV4Schema = BasePayloadSchema.extend({
  version: z.literal(4),
  folders: z.array(FolderSchema).max(MAX_FOLDERS_COUNT).optional(),
  records: z.array(VoiceRecordSchema).max(MAX_RECORDS_COUNT),
  graphLayouts: z.array(NotesGraphLayoutVersionSchema).max(5_000).optional(),
});

const ExportPayloadSchema = z.discriminatedUnion('version', [
  ExportPayloadV1Schema,
  ExportPayloadV2Schema,
  ExportPayloadV3Schema,
  ExportPayloadV4Schema,
]);

export type BackupExportPayload = z.infer<typeof ExportPayloadSchema>;

export type BackupGraphLayoutVersion = z.infer<typeof NotesGraphLayoutVersionSchema>;

const VALID_CLASSIFICATIONS: RecordClassification[] = [
  'personal',
  'work',
  'meeting',
  'idea',
  'other',
];

const MAX_MEETING_DIALOGUE_IMPORT_CHARS = 12_000;

function normalizeRecordingMarks(raw: unknown): RecordingMark[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const out: RecordingMark[] = [];
  for (let i = 0; i < raw.length; i++) {
    const mark = sanitizeRecordingMark(raw[i], i);
    if (mark) out.push(mark);
  }
  return out.length > 0 ? out : undefined;
}

function normalizeDurationField(value: unknown): string {
  if (value === null || value === undefined) {
    return '0:00';
  }

  if (isString(value)) {
    return value;
  }

  if (isNumber(value) && Number.isFinite(value)) {
    const totalSec = Math.max(0, Math.floor(value));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;

    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return '0:00';
}

function normalizeMeetingDialogueImport(raw: unknown): string | undefined {
  if (!isString(raw)) return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  return t.length > MAX_MEETING_DIALOGUE_IMPORT_CHARS
    ? t.slice(0, MAX_MEETING_DIALOGUE_IMPORT_CHARS)
    : t;
}

function normalizeImportedStatus(
  base: Partial<VoiceRecord> & { isRead?: boolean | null },
): RecordStatus {
  if (base.status === 'unread' || base.status === 'read' || base.status === 'archived') {
    return base.status;
  }
  if (base.isRead === true) return 'read';
  if (base.isRead === false) return 'unread';
  return 'unread';
}

function normalizeImportedTags(raw: unknown): string[] {
  if (!isArray(raw)) return [];
  return raw.filter(isStringArrayItem);
}

function normalizeImportedTranscriptSegments(raw: unknown): TranscriptSegment[] | undefined {
  if (!isArray(raw) || raw.length === 0) return undefined;

  const out: TranscriptSegment[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !isString(item.id) || !isString(item.text)) continue;
    const text = item.text.trim();
    if (!text) continue;
    out.push({
      id: item.id.trim(),
      startTime: isString(item.startTime) ? item.startTime : '0:00',
      startMs: isNumber(item.startMs) && Number.isFinite(item.startMs) ? item.startMs : undefined,
      endMs: isNumber(item.endMs) && Number.isFinite(item.endMs) ? item.endMs : undefined,
      text,
    });
  }

  return out.length > 0 ? out : undefined;
}

export function normalizeImportedVoiceRecord(raw: z.infer<typeof VoiceRecordSchema>): VoiceRecord {
  const base = raw as Partial<VoiceRecord> & { isRead?: boolean | null };

  const classification: VoiceRecord['classification'] =
    isString(base.classification) &&
    VALID_CLASSIFICATIONS.includes(base.classification as RecordClassification)
      ? (base.classification as RecordClassification)
      : undefined;

  const keyPhrases: string[] = isArray(base.keyPhrases)
    ? base.keyPhrases.filter(isStringArrayItem)
    : [];

  const nextSteps: string[] = isArray(base.nextSteps)
    ? base.nextSteps.filter(isStringArrayItem)
    : [];

  const tasks = normalizeImportedTasks(base.tasks);
  const tags = normalizeImportedTags(base.tags);
  const transcriptSegments = normalizeImportedTranscriptSegments(base.transcriptSegments);
  const status = normalizeImportedStatus(base);
  const readAt = isString(base.readAt) && base.readAt.trim().length > 0 ? base.readAt.trim() : null;

  return {
    ...base,
    title: isString(base.title) ? base.title : '',
    transcript: isString(base.transcript) ? base.transcript : '',
    duration: normalizeDurationField(base.duration),
    durationMs:
      isNumber(base.durationMs) && Number.isFinite(base.durationMs) ? base.durationMs : undefined,
    status,
    readAt,
    classification: classification ?? base.classification,
    keyPhrases: keyPhrases.length > 0 ? keyPhrases : (base.keyPhrases ?? []),
    nextSteps: nextSteps.length > 0 ? nextSteps : (base.nextSteps ?? []),
    tags: tags.length > 0 ? tags : undefined,
    tasks,
    transcriptSegments,
    meetingDialogue: normalizeMeetingDialogueImport(base.meetingDialogue),
    meetingSpeakerLabels: sanitizeMeetingSpeakerLabels(base.meetingSpeakerLabels),
    meetingSummaryTemplate:
      base.meetingSummaryTemplate === 'general' ? undefined : base.meetingSummaryTemplate,
    translatedTranscript: isString(base.translatedTranscript)
      ? base.translatedTranscript
      : undefined,
    translationLanguage: isString(base.translationLanguage) ? base.translationLanguage : undefined,
    recordingMarks: normalizeRecordingMarks(base.recordingMarks),
    embedding:
      isArray(base.embedding) && base.embedding.every((v) => isNumber(v) && Number.isFinite(v))
        ? (base.embedding as number[])
        : undefined,
  } as VoiceRecord;
}

export function parseBackupMetadataPayload(raw: unknown): BackupExportPayload | null {
  const result = ExportPayloadSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function normalizeBackupFolders(
  raw: readonly z.infer<typeof FolderSchema>[] | undefined,
): Folder[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((f) => isString(f.id) && isString(f.name))
    .map((f) => ({
      id: f.id,
      name: f.name,
      color: isString(f.color) ? f.color : DEFAULT_FOLDER_BRAND_HEX,
      icon: isString(f.icon) ? f.icon : DEFAULT_FOLDER_ICON_KEY,
      sortOrder: isNumber(f.sortOrder) && Number.isFinite(f.sortOrder) ? f.sortOrder : 0,
      createdAt: isString(f.createdAt) ? f.createdAt : dayjs().toISOString(),
    }));
}

export function normalizeBackupGraphLayouts(
  raw: readonly BackupGraphLayoutVersion[] | undefined,
): BackupGraphLayoutVersion[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter(
    (entry) =>
      isString(entry.id) &&
      isString(entry.layoutKey) &&
      Number.isFinite(entry.versionNumber) &&
      entry.versionNumber >= 1 &&
      isString(entry.createdAt) &&
      isString(entry.payload) &&
      entry.payload.length > 0,
  );
}

export function buildLegacyBackupFolders(
  records: readonly z.infer<typeof VoiceRecordSchema>[],
): Folder[] {
  const legacyFolderIds = Array.from(
    new Set(
      records.map((r) => r.folderId).filter((v): v is string => isString(v) && v.trim().length > 0),
    ),
  );

  return legacyFolderIds.map((folderId, index) => ({
    id: folderId,
    name: `Imported folder ${index + 1}`,
    color: DEFAULT_FOLDER_BRAND_HEX,
    icon: DEFAULT_FOLDER_ICON_KEY,
    sortOrder: index,
    createdAt: dayjs().toISOString(),
  }));
}
