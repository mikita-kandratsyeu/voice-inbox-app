import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const foldersTable = sqliteTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  color: text('color').default('#6b7280'),
  icon: text('icon').default('📁'),
  sortOrder: integer('sortOrder').default(0),
  createdAt: text('createdAt').notNull(),
});

export const recordsTable = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    transcript: text('transcript').default(''),
    transcriptSegments: text('transcriptSegments').default('[]'),
    summary: text('summary').default(''),
    tasks: text('tasks').default('[]'),
    duration: text('duration').default('0:00'),
    durationMs: integer('durationMs').default(0),
    createdAt: text('createdAt').default(''),
    relativeTime: text('relativeTime').default(''),
    status: text('status').default('unread'),
    readAt: text('readAt'),
    aiStatus: text('aiStatus').default('idle'),
    transcriptProgress: integer('transcriptProgress').default(0),
    isPinned: integer('isPinned').default(0),
    tags: text('tags').default('[]'),
    recordingMarks: text('recordingMarks').default('[]'),
    classification: text('classification'),
    keyPhrases: text('keyPhrases').default('[]'),
    nextSteps: text('nextSteps').default('[]'),
    meetingDialogue: text('meetingDialogue'),
    meetingSpeakerLabels: text('meetingSpeakerLabels'),
    cloudAiJobId: text('cloudAiJobId'),
    summaryReasoning: text('summaryReasoning'),
    summaryAiModel: text('summaryAiModel'),
    summaryTokensPrompt: integer('summaryTokensPrompt'),
    summaryTokensCompletion: integer('summaryTokensCompletion'),
    summaryGenerationMs: integer('summaryGenerationMs'),
    translatedTranscript: text('translatedTranscript'),
    translationLanguage: text('translationLanguage'),
    audioPath: text('audioPath'),
    embedding: text('embedding'),
    folderId: text('folderId'),
    deletedAt: text('deletedAt'),
    purgeAt: text('purgeAt'),
  },
  (t) => [
    index('idx_records_isPinned').on(t.isPinned),
    index('idx_records_createdAt').on(t.createdAt),
    index('idx_records_folderId').on(t.folderId),
    index('idx_records_purgeAt').on(t.purgeAt),
  ],
);

export const recordAskAiTable = sqliteTable('record_ask_ai', {
  recordId: text('recordId').primaryKey(),
  payload: text('payload').notNull(),
  updatedAt: text('updatedAt').notNull(),
});

/** Cloud summarize job to resume after app kill (one row per record). */
export const cloudAiPendingTable = sqliteTable(
  'cloud_ai_pending',
  {
    recordId: text('recordId').primaryKey(),
    jobId: text('jobId').notNull(),
    syncToken: text('syncToken'),
    expectAsyncMeetingDialogue: integer('expectAsyncMeetingDialogue').default(0).notNull(),
    expiresAtMs: integer('expiresAtMs').notNull(),
    updatedAt: text('updatedAt').notNull(),
  },
  (t) => [index('idx_cloud_ai_pending_jobId').on(t.jobId)],
);

export type RecordRow = typeof recordsTable.$inferSelect;
export type RecordInsert = typeof recordsTable.$inferInsert;
export type FolderRow = typeof foldersTable.$inferSelect;
export type FolderInsert = typeof foldersTable.$inferInsert;
export type RecordAskAiRow = typeof recordAskAiTable.$inferSelect;
export type CloudAiPendingRow = typeof cloudAiPendingTable.$inferSelect;
