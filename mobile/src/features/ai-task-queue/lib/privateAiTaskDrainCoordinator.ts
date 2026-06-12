import { useRecordStore } from '@/entities/record';
import { isPrivateCustomServerMode, useSettingsStore } from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { waitForDb } from '@/shared/lib';

import { processRecordViaPrivateAiBridge } from './privateAiTaskProcessBridge';
import {
  listPrivateAiTasks,
  markPrivateAiTaskAttempt,
  type PrivateAiQueuedTask,
  removePrivateAiTask,
} from './privateAiTaskQueueDb';
import { isPrivateRemoteServerReachable } from './privateRemoteReachability';

const drainInFlightByTask = new Map<string, Promise<void>>();
let drainAllScheduled: ReturnType<typeof setTimeout> | null = null;
let drainAllInFlight: Promise<void> | null = null;

const MAX_CONCURRENT_DRAINS = 1;
let activeDrains = 0;
const waitQueue: Array<() => void> = [];

function acquireDrainSlot(): Promise<void> {
  if (activeDrains < MAX_CONCURRENT_DRAINS) {
    activeDrains += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeDrains += 1;
      resolve();
    });
  });
}

function releaseDrainSlot(): void {
  activeDrains = Math.max(0, activeDrains - 1);
  const next = waitQueue.shift();
  if (next) next();
}

function isPrivateServerAutomationActive(): boolean {
  const settings = useSettingsStore.getState();
  return isPrivateCustomServerMode(
    settings.aiExecutionMode,
    settings.privateAiProvider,
    isProActiveFromStorageSync(),
  );
}

function shouldSkipTask(recordId: string): boolean {
  const record = useRecordStore.getState().records.find((r) => r.id === recordId);
  if (!record?.transcript?.trim()) return true;
  if (record.summaryStatus === 'processing' || record.tasksStatus === 'processing') return true;
  if (record.summary?.trim() && record.summaryStatus === 'done') return true;
  return false;
}

async function runDrainTask(task: PrivateAiQueuedTask): Promise<void> {
  if (!isPrivateServerAutomationActive()) return;
  if (shouldSkipTask(task.recordId)) {
    await removePrivateAiTask(task.id);
    return;
  }

  const existing = drainInFlightByTask.get(task.id);
  if (existing) {
    await existing;
    return;
  }

  const job = (async () => {
    await acquireDrainSlot();
    try {
      const record = useRecordStore.getState().records.find((r) => r.id === task.recordId);
      if (!record) {
        await removePrivateAiTask(task.id);
        return;
      }

      const reachable = await isPrivateRemoteServerReachable();
      if (!reachable) return;

      const { setSummaryStatus } = useRecordStore.getState();
      setSummaryStatus(task.recordId, 'queued');

      const processed = await processRecordViaPrivateAiBridge(record);
      if (!processed) return;

      const latest = useRecordStore.getState().records.find((r) => r.id === task.recordId);
      if (latest?.summaryStatus === 'done' && Boolean(latest.summary?.trim())) {
        await removePrivateAiTask(task.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markPrivateAiTaskAttempt(task.id, message);
    } finally {
      releaseDrainSlot();
    }
  })();

  drainInFlightByTask.set(task.id, job);
  try {
    await job;
  } finally {
    drainInFlightByTask.delete(task.id);
  }
}

export async function drainPrivateAiTaskQueue(): Promise<void> {
  if (!isPrivateServerAutomationActive()) return;

  try {
    await waitForDb();
  } catch {
    return;
  }

  const reachable = await isPrivateRemoteServerReachable();
  if (!reachable) return;

  const tasks = await listPrivateAiTasks();
  for (const task of tasks) {
    await runDrainTask(task);
  }
}

export async function drainSinglePrivateAiTask(taskId: string): Promise<void> {
  if (!isPrivateServerAutomationActive()) return;

  try {
    await waitForDb();
  } catch {
    return;
  }

  const tasks = await listPrivateAiTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const reachable = await isPrivateRemoteServerReachable({ forceRefresh: true });
  if (!reachable) {
    await markPrivateAiTaskAttempt(task.id, 'server_unreachable');
    return;
  }

  await runDrainTask(task);
}

const FOREGROUND_DRAIN_DEBOUNCE_MS = 2_500;

export function scheduleDrainPrivateAiTaskQueue(): void {
  if (!isPrivateServerAutomationActive()) return;

  if (drainAllScheduled) {
    clearTimeout(drainAllScheduled);
  }

  drainAllScheduled = setTimeout(() => {
    drainAllScheduled = null;
    if (drainAllInFlight) {
      void drainAllInFlight.finally(() => {
        drainAllInFlight = drainPrivateAiTaskQueue();
      });
      return;
    }
    drainAllInFlight = drainPrivateAiTaskQueue()
      .catch(() => {})
      .finally(() => {
        drainAllInFlight = null;
      });
  }, FOREGROUND_DRAIN_DEBOUNCE_MS);
}
