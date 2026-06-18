import { z } from 'zod';

// MARK: - Snapshot (Phone → Watch)

export const WatchTaskSchema = z.object({
  id: z.string(),
  recordId: z.string(),
  text: z.string(),
  isCompleted: z.boolean(),
  dueDate: z.string().nullable(),
});

export const WatchNoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  createdAt: z.string(),
});

export const WatchSnapshotSchema = z.object({
  updatedAt: z.string(),
  tasksToday: z.array(WatchTaskSchema),
  recentNotes: z.array(WatchNoteSchema),
  schemaVersion: z.literal(1),
});

export type WatchTask = z.infer<typeof WatchTaskSchema>;
export type WatchNote = z.infer<typeof WatchNoteSchema>;
export type WatchSnapshot = z.infer<typeof WatchSnapshotSchema>;

export interface WatchApplicationContext {
  updatedAt: string;
  snapshotJson: string;
  schemaVersion: number;
}

// MARK: - Recording Metadata (Watch → Phone)

export const RecordingMetadataSchema = z.object({
  watchRecordingId: z.string(),
  createdAt: z.string(),
  durationSeconds: z.number(),
  source: z.literal('watch'),
});

export type RecordingMetadata = z.infer<typeof RecordingMetadataSchema>;

// MARK: - Commands (Watch ↔ Phone)

export const ToggleTaskCommandSchema = z.object({
  type: z.literal('toggleTask'),
  taskId: z.string(),
  recordId: z.string(),
});

export const OpenNoteCommandSchema = z.object({
  type: z.literal('openNote'),
  recordId: z.string(),
});

export const SyncResultCommandSchema = z.object({
  type: z.literal('syncResult'),
  watchRecordingId: z.string(),
  status: z.enum(['success', 'error']),
  recordId: z.string().optional(),
});

export const WatchCommandSchema = z.discriminatedUnion('type', [
  ToggleTaskCommandSchema,
  OpenNoteCommandSchema,
  SyncResultCommandSchema,
]);

export type ToggleTaskCommand = z.infer<typeof ToggleTaskCommandSchema>;
export type OpenNoteCommand = z.infer<typeof OpenNoteCommandSchema>;
export type SyncResultCommand = z.infer<typeof SyncResultCommandSchema>;
export type WatchCommand = z.infer<typeof WatchCommandSchema>;
