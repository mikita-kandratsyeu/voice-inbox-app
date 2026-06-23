import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
    meetingSummaryTemplate: text('meetingSummaryTemplate'),
    cloudAiJobId: text('cloudAiJobId'),
    summaryReasoning: text('summaryReasoning'),
    summaryAiModel: text('summaryAiModel'),
    summaryAiModelLabel: text('summaryAiModelLabel'),
    summaryAiModelMode: text('summaryAiModelMode'),
    summaryTokensPrompt: integer('summaryTokensPrompt'),
    summaryTokensCompletion: integer('summaryTokensCompletion'),
    summaryGenerationMs: integer('summaryGenerationMs'),
    translatedTranscript: text('translatedTranscript'),
    translationLanguage: text('translationLanguage'),
    audioPath: text('audioPath'),
    embedding: text('embedding'),
    folderId: text('folderId'),
    linkedRecordIds: text('linkedRecordIds').default('[]'),
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

export const inboxAskAiTable = sqliteTable('inbox_ask_ai', {
  sessionKey: text('sessionKey').primaryKey(),
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

/** Deferred private-server AI work (summarize after transcription, etc.). */
export const privateAiTaskQueueTable = sqliteTable(
  'private_ai_task_queue',
  {
    id: text('id').primaryKey(),
    recordId: text('recordId').notNull(),
    taskType: text('taskType').notNull(),
    source: text('source').notNull(),
    attemptCount: integer('attemptCount').default(0).notNull(),
    lastError: text('lastError'),
    createdAt: text('createdAt').notNull(),
    updatedAt: text('updatedAt').notNull(),
  },
  (t) => [
    index('idx_private_ai_task_queue_recordId').on(t.recordId),
    uniqueIndex('idx_private_ai_task_queue_record_task').on(t.recordId, t.taskType),
  ],
);

export const recordPublishedShareTable = sqliteTable(
  'record_published_share',
  {
    recordId: text('recordId').primaryKey(),
    shareToken: text('shareToken').notNull(),
    shareUrl: text('shareUrl').notNull(),
    template: text('template').notNull(),
    contentHash: text('contentHash').notNull(),
    publishedAt: text('publishedAt').notNull(),
    expiresAt: text('expiresAt'),
    updatedAt: text('updatedAt').notNull(),
  },
  (t) => [
    uniqueIndex('idx_record_published_share_token').on(t.shareToken),
    index('idx_record_published_share_expires').on(t.expiresAt),
  ],
);

/** Versioned note-map node positions (per filter layout key). */
export const notesGraphLayoutVersionTable = sqliteTable(
  'notes_graph_layout_version',
  {
    id: text('id').primaryKey(),
    layoutKey: text('layoutKey').notNull(),
    versionNumber: integer('versionNumber').notNull(),
    payload: text('payload').notNull(),
    createdAt: text('createdAt').notNull(),
    name: text('name'),
  },
  (t) => [
    index('idx_notes_graph_layout_key').on(t.layoutKey),
    index('idx_notes_graph_layout_created').on(t.createdAt),
  ],
);

export type RecordRow = typeof recordsTable.$inferSelect;
export type RecordInsert = typeof recordsTable.$inferInsert;
export type FolderRow = typeof foldersTable.$inferSelect;
export type FolderInsert = typeof foldersTable.$inferInsert;
export type RecordAskAiRow = typeof recordAskAiTable.$inferSelect;
export type InboxAskAiRow = typeof inboxAskAiTable.$inferSelect;
export type CloudAiPendingRow = typeof cloudAiPendingTable.$inferSelect;
export type PrivateAiTaskQueueRow = typeof privateAiTaskQueueTable.$inferSelect;
export type RecordPublishedShareRow = typeof recordPublishedShareTable.$inferSelect;
export type NotesGraphLayoutVersionRow = typeof notesGraphLayoutVersionTable.$inferSelect;
