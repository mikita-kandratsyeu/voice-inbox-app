import { getCloudSummarizePending, listCloudSummarizePendingForResume } from '@/shared/lib/ai-api';

import { isCloudSummarizeInFlight } from './cloudSummarizeInFlight';
import { resumeCloudSummarizeJob } from './resumeCloudSummarize';

const resumeInFlightByRecord = new Map<string, Promise<void>>();
let resumeAllScheduled: ReturnType<typeof setTimeout> | null = null;
let resumeAllInFlight: Promise<void> | null = null;

const MAX_CONCURRENT_RESUMES = 2;
let activeResumes = 0;
const waitQueue: Array<() => void> = [];

function acquireResumeSlot(): Promise<void> {
  if (activeResumes < MAX_CONCURRENT_RESUMES) {
    activeResumes += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeResumes += 1;
      resolve();
    });
  });
}

function releaseResumeSlot(): void {
  activeResumes = Math.max(0, activeResumes - 1);
  const next = waitQueue.shift();
  if (next) next();
}

async function runResume(
  pending: Awaited<ReturnType<typeof getCloudSummarizePending>>,
): Promise<void> {
  if (!pending) return;
  if (isCloudSummarizeInFlight(pending.recordId)) return;

  const existing = resumeInFlightByRecord.get(pending.recordId);
  if (existing) {
    await existing;
    return;
  }

  const task = (async () => {
    await acquireResumeSlot();
    try {
      await resumeCloudSummarizeJob(pending);
    } finally {
      releaseResumeSlot();
    }
  })();

  resumeInFlightByRecord.set(pending.recordId, task);
  try {
    await task;
  } finally {
    resumeInFlightByRecord.delete(pending.recordId);
  }
}

/** Resume a single record's cloud summarize job (no-op if none / in-flight live run). */
export function resumeCloudSummarizeForRecord(recordId: string): void {
  void (async () => {
    const pending = await getCloudSummarizePending(recordId);
    await runResume(pending);
  })();
}

const FOREGROUND_RESUME_DEBOUNCE_MS = 2_500;

/** Debounced: resume a small batch of pending jobs after app foreground. */
export function scheduleResumeAllPendingCloudSummarize(): void {
  if (resumeAllScheduled) {
    clearTimeout(resumeAllScheduled);
  }
  resumeAllScheduled = setTimeout(() => {
    resumeAllScheduled = null;
    if (resumeAllInFlight) {
      void resumeAllInFlight.finally(() => {
        resumeAllInFlight = resumeAllPendingCloudSummarize();
      });
      return;
    }
    resumeAllInFlight = resumeAllPendingCloudSummarize().finally(() => {
      resumeAllInFlight = null;
    });
  }, FOREGROUND_RESUME_DEBOUNCE_MS);
}

async function resumeAllPendingCloudSummarize(): Promise<void> {
  const pendingList = await listCloudSummarizePendingForResume();
  for (const pending of pendingList) {
    await runResume(pending);
  }
}
