import dayjs from 'dayjs';
import { eq, gt } from 'drizzle-orm';

import { cloudAiPendingTable, waitForDb } from '@/shared/lib';

export type CloudSummarizePendingJob = {
  recordId: string;
  jobId: string;
  syncToken?: string;
  expectAsyncMeetingDialogue: boolean;
  expiresAtMs: number;
  pollExpiresAtMs?: number | null;
};

/** `rec_*-ai-<ts>` → record id */
export function recordIdFromSummarizeJobId(jobId: string): string | null {
  const m = /^(.+)-ai-\d+$/.exec(jobId.trim());
  return m?.[1] ?? null;
}

export async function saveCloudSummarizePending(job: CloudSummarizePendingJob): Promise<void> {
  const db = await waitForDb();
  await db
    .insert(cloudAiPendingTable)
    .values({
      recordId: job.recordId,
      jobId: job.jobId,
      syncToken: job.syncToken ?? null,
      expectAsyncMeetingDialogue: job.expectAsyncMeetingDialogue ? 1 : 0,
      expiresAtMs: job.expiresAtMs,
      pollExpiresAtMs: job.pollExpiresAtMs ?? null,
      updatedAt: dayjs().toISOString(),
    })
    .onConflictDoUpdate({
      target: cloudAiPendingTable.recordId,
      set: {
        jobId: job.jobId,
        syncToken: job.syncToken ?? null,
        expectAsyncMeetingDialogue: job.expectAsyncMeetingDialogue ? 1 : 0,
        expiresAtMs: job.expiresAtMs,
        pollExpiresAtMs: job.pollExpiresAtMs ?? null,
        updatedAt: dayjs().toISOString(),
      },
    });
}

export async function clearCloudSummarizePending(recordId: string): Promise<void> {
  const db = await waitForDb();
  await db.delete(cloudAiPendingTable).where(eq(cloudAiPendingTable.recordId, recordId));
}

export async function getCloudSummarizePending(
  recordId: string,
): Promise<CloudSummarizePendingJob | null> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(cloudAiPendingTable)
    .where(eq(cloudAiPendingTable.recordId, recordId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAtMs <= Date.now()) {
    await clearCloudSummarizePending(recordId);
    return null;
  }
  return {
    recordId: row.recordId,
    jobId: row.jobId,
    syncToken: row.syncToken ?? undefined,
    expectAsyncMeetingDialogue: row.expectAsyncMeetingDialogue === 1,
    expiresAtMs: row.expiresAtMs,
    pollExpiresAtMs: row.pollExpiresAtMs ?? null,
  };
}

const PENDING_RESUME_BATCH_LIMIT = 4;

export async function listCloudSummarizePendingForResume(): Promise<CloudSummarizePendingJob[]> {
  const db = await waitForDb();
  const now = Date.now();
  const rows = await db
    .select()
    .from(cloudAiPendingTable)
    .where(gt(cloudAiPendingTable.expiresAtMs, now))
    .limit(PENDING_RESUME_BATCH_LIMIT);
  return rows.map((row) => ({
    recordId: row.recordId,
    jobId: row.jobId,
    syncToken: row.syncToken ?? undefined,
    expectAsyncMeetingDialogue: row.expectAsyncMeetingDialogue === 1,
    expiresAtMs: row.expiresAtMs,
    pollExpiresAtMs: row.pollExpiresAtMs ?? null,
  }));
}
