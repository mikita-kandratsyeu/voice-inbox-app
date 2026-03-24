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
    aiStatus: text('aiStatus').default('idle'),
    transcriptProgress: integer('transcriptProgress').default(0),
    isPinned: integer('isPinned').default(0),
    tags: text('tags').default('[]'),
    classification: text('classification'),
    keyPhrases: text('keyPhrases').default('[]'),
    nextSteps: text('nextSteps').default('[]'),
    translatedTranscript: text('translatedTranscript'),
    translationLanguage: text('translationLanguage'),
    audioPath: text('audioPath'),
    embedding: text('embedding'),
    folderId: text('folderId'),
  },
  (t) => [
    index('idx_records_isPinned').on(t.isPinned),
    index('idx_records_createdAt').on(t.createdAt),
    index('idx_records_folderId').on(t.folderId),
  ],
);

export type RecordRow = typeof recordsTable.$inferSelect;
export type RecordInsert = typeof recordsTable.$inferInsert;
export type FolderRow = typeof foldersTable.$inferSelect;
export type FolderInsert = typeof foldersTable.$inferInsert;
