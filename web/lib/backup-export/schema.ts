import { z } from 'zod';

const MAX_SHORT = 100_000;
const MAX_LONG = 10_000_000;

const str = z.string().max(MAX_SHORT);
const longStr = z.string().max(MAX_LONG);

const TaskItemSchema = z
  .object({
    id: str,
    text: longStr,
    isDone: z.boolean().optional(),
    deadline: str.nullish(),
    priority: z.enum(['high', 'medium', 'low']).nullish(),
    source: z.enum(['manual', 'ai']).nullish(),
  })
  .passthrough();

const FolderSchema = z
  .object({
    id: str,
    name: str,
    color: str.nullish(),
    icon: str.nullish(),
    sortOrder: z.number().nullish(),
    createdAt: str.nullish(),
  })
  .passthrough();

const VoiceRecordSchema = z
  .object({
    id: str,
    createdAt: str,
    updatedAt: str.nullish(),
    title: str.nullish(),
    transcript: longStr.nullish(),
    translatedTranscript: longStr.nullish(),
    translationLanguage: str.nullish(),
    summary: longStr.nullish(),
    classification: z.enum(['personal', 'work', 'meeting', 'idea', 'other']).nullish(),
    keyPhrases: z.array(str).nullish(),
    nextSteps: z.array(str).nullish(),
    folderId: str.nullish(),
    audioPath: str.nullish(),
    duration: z.union([str, z.number()]).nullish(),
    tags: z.array(str).nullish(),
    tasks: z.array(TaskItemSchema).nullish(),
    isPinned: z.boolean().nullish(),
    status: z.enum(['unread', 'read', 'archived']).nullish(),
  })
  .passthrough();

export const ExportPayloadV3Schema = z.object({
  version: z.literal(3),
  exportedAt: str,
  folders: z.array(FolderSchema).max(10_000).optional(),
  records: z.array(VoiceRecordSchema).max(50_000),
});

export type ExportPayloadV3 = z.infer<typeof ExportPayloadV3Schema>;
