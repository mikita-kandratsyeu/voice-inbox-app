import dayjs from 'dayjs';
import { asc, eq, sql } from 'drizzle-orm';

import { privateAiTaskQueueTable, waitForDb } from '@/shared/lib';

export type PrivateAiTaskType = 'summarize';

export type PrivateAiTaskSource = 'auto_after_transcription' | 'manual_regenerate';

export type PrivateAiQueuedTask = {
  id: string;
  recordId: string;
  taskType: PrivateAiTaskType;
  source: PrivateAiTaskSource;
  attemptCount: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: typeof privateAiTaskQueueTable.$inferSelect): PrivateAiQueuedTask {
  return {
    id: row.id,
    recordId: row.recordId,
    taskType: row.taskType as PrivateAiTaskType,
    source: row.source as PrivateAiTaskSource,
    attemptCount: row.attemptCount,
    lastError: row.lastError ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function enqueuePrivateAiTask(input: {
  recordId: string;
  taskType: PrivateAiTaskType;
  source: PrivateAiTaskSource;
}): Promise<PrivateAiQueuedTask> {
  const db = await waitForDb();
  const now = dayjs().toISOString();
  const id = `pait_${input.recordId}_${input.taskType}`;

  await db
    .insert(privateAiTaskQueueTable)
    .values({
      id,
      recordId: input.recordId,
      taskType: input.taskType,
      source: input.source,
      attemptCount: 0,
      lastError: null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [privateAiTaskQueueTable.recordId, privateAiTaskQueueTable.taskType],
      set: {
        source: input.source,
        lastError: null,
        updatedAt: now,
      },
    });

  const rows = await db
    .select()
    .from(privateAiTaskQueueTable)
    .where(eq(privateAiTaskQueueTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error('Failed to enqueue private AI task');
  }
  return mapRow(row);
}

export async function listPrivateAiTasks(): Promise<PrivateAiQueuedTask[]> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(privateAiTaskQueueTable)
    .orderBy(asc(privateAiTaskQueueTable.createdAt));
  return rows.map(mapRow);
}

export async function countPrivateAiTasks(): Promise<number> {
  const db = await waitForDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(privateAiTaskQueueTable);
  return rows[0]?.count ?? 0;
}

export async function getPrivateAiTaskById(id: string): Promise<PrivateAiQueuedTask | null> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(privateAiTaskQueueTable)
    .where(eq(privateAiTaskQueueTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? mapRow(row) : null;
}

export async function removePrivateAiTask(id: string): Promise<void> {
  const db = await waitForDb();
  await db.delete(privateAiTaskQueueTable).where(eq(privateAiTaskQueueTable.id, id));
}

export async function removePrivateAiTasksForRecord(recordId: string): Promise<void> {
  const db = await waitForDb();
  await db.delete(privateAiTaskQueueTable).where(eq(privateAiTaskQueueTable.recordId, recordId));
}

export async function clearPrivateAiTasks(): Promise<void> {
  const db = await waitForDb();
  await db.delete(privateAiTaskQueueTable);
}

export async function markPrivateAiTaskAttempt(id: string, lastError?: string): Promise<void> {
  const db = await waitForDb();
  await db
    .update(privateAiTaskQueueTable)
    .set({
      attemptCount: sql`${privateAiTaskQueueTable.attemptCount} + 1`,
      lastError: lastError ?? null,
      updatedAt: dayjs().toISOString(),
    })
    .where(eq(privateAiTaskQueueTable.id, id));
}
