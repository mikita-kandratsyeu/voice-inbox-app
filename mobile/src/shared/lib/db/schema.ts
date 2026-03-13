import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
  },
  (t) => [
    index('idx_records_isPinned').on(t.isPinned),
    index('idx_records_createdAt').on(t.createdAt),
  ],
);

export type RecordRow = typeof recordsTable.$inferSelect;
export type RecordInsert = typeof recordsTable.$inferInsert;
