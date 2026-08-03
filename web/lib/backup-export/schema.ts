import { z } from 'zod';

const MAX_SHORT = 100_000;
/** Max characters for transcript / summary / translation in strict validation. */
export const EXPORT_MAX_RECORD_TEXT_CHARS = 10_000_000;
const MAX_LONG = EXPORT_MAX_RECORD_TEXT_CHARS;

const str = z.string().max(MAX_SHORT);
const longStr = z.string().max(MAX_LONG);

const TaskItemSchema = z
  .object({
    id: str,
    text: longStr,
    isDone: z.boolean().optional(),
    deadline: str.nullish(),
    deadlineTime: str.nullish(),
    priority: z.enum(['high', 'medium', 'low']).nullish(),
    source: z.enum(['manual', 'ai']).nullish(),
  })
  .passthrough();

export const FolderSchema = z
  .object({
    id: str,
    name: str,
    color: str.nullish(),
    icon: str.nullish(),
    sortOrder: z.number().nullish(),
    createdAt: str.nullish(),
  })
  .passthrough();

const RecordingMarkSchema = z
  .object({
    id: str.max(200),
    offsetMs: z.number().finite(),
    kind: z
      .enum(['moment', 'important', 'task', 'quote', 'decision', 'question', 'topic'])
      .optional(),
    label: str.max(300).optional(),
  })
  .passthrough();

export const TranscriptSegmentSchema = z
  .object({
    id: str,
    startTime: str.nullish(),
    startMs: z.number().optional(),
    endMs: z.number().optional(),
    text: longStr.nullish(),
    speakerId: str.nullish(),
    language: str.nullish(),
    isOverlapping: z.boolean().optional(),
  })
  .passthrough();

export const VoiceRecordSchema = z
  .object({
    id: str,
    createdAt: str,
    updatedAt: str.nullish(),
    title: str.nullish(),
    transcript: longStr.nullish(),
    transcriptSegments: z.array(TranscriptSegmentSchema).max(50_000).nullish(),
    translatedTranscript: longStr.nullish(),
    translationLanguage: str.nullish(),
    summary: longStr.nullish(),
    classification: z.enum(['personal', 'work', 'meeting', 'idea', 'other']).nullish(),
    keyPhrases: z.array(str).nullish(),
    nextSteps: z.array(str).nullish(),
    meetingDialogue: longStr.nullish(),
    meetingSpeakerLabels: z.record(z.string(), z.string()).nullish(),
    meetingSummaryTemplate: z
      .enum([
        'general',
        'standup',
        'sales_call',
        'one_on_one',
        'interview',
        'product_meeting',
        'lecture',
      ])
      .nullish(),
    recordingMarks: z.array(RecordingMarkSchema).max(500).nullish(),
    durationMs: z.number().finite().nullish(),
    folderId: str.nullish(),
    audioPath: str.nullish(),
    duration: z.union([str, z.number()]).nullish(),
    tags: z.array(str).nullish(),
    tasks: z.array(TaskItemSchema).nullish(),
    isPinned: z.boolean().nullish(),
    status: z.enum(['unread', 'read', 'archived']).nullish(),
    language: str.nullish(),
    linkedRecordIds: z.array(str).max(1_000).nullish(),
  })
  .passthrough();

const NotesGraphLayoutVersionSchema = z
  .object({
    id: str,
    layoutKey: str,
    versionNumber: z.number().int().min(1),
    createdAt: str,
    payload: str,
    name: str.optional(),
  })
  .passthrough();

export const ExportPayloadV3Schema = z.object({
  version: z.literal(3),
  exportedAt: str,
  folders: z.array(FolderSchema).max(10_000).optional(),
  records: z.array(VoiceRecordSchema).max(50_000),
});

/** Validates JSON shell; rows are checked individually in `parseBackupZip` so one bad record does not fail the whole backup. */
export const ExportPayloadV3EnvelopeSchema = z.object({
  version: z.literal(3),
  exportedAt: str,
  folders: z.array(z.unknown()).max(10_000).optional(),
  records: z.array(z.unknown()).max(50_000),
});

export const ExportPayloadV4Schema = z.object({
  version: z.literal(4),
  exportedAt: str,
  folders: z.array(FolderSchema).max(10_000).optional(),
  records: z.array(VoiceRecordSchema).max(50_000),
  graphLayouts: z.array(NotesGraphLayoutVersionSchema).max(5_000).optional(),
});

export const ExportPayloadV4EnvelopeSchema = z.object({
  version: z.literal(4),
  exportedAt: str,
  folders: z.array(z.unknown()).max(10_000).optional(),
  records: z.array(z.unknown()).max(50_000),
  graphLayouts: z.array(z.unknown()).max(5_000).optional(),
});

export type ExportPayloadV3 = z.infer<typeof ExportPayloadV3Schema>;
export type ExportPayloadV4 = z.infer<typeof ExportPayloadV4Schema>;
export type ParsedGraphLayoutRaw = z.infer<typeof NotesGraphLayoutVersionSchema>;
