import { useRecordStore } from '@/entities/record';
import {
  hydratePrivateRemoteWorkingConfig,
  isPrivateCustomServerMode,
  useSettingsStore,
} from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { waitForDb } from '@/shared/lib';

import { processRecordViaPrivateAiBridge } from './privateAiTaskProcessBridge';
import {
  getPrivateAiTaskById,
  listPrivateAiTasks,
  markPrivateAiTaskAttempt,
  type PrivateAiQueuedTask,
  removePrivateAiTask,
} from './privateAiTaskQueueDb';
import { isPrivateRemoteServerReachable } from './privateRemoteReachability';

const drainInFlightByTask = new Map<string, Promise<void>>();
let drainAllScheduled: ReturnType<typeof setTimeout> | null = null;
let drainAllInFlight: Promise<DrainQueueResult> | null = null;

let activeDrains = 0;
const waitQueue: Array<() => void> = [];

function getMaxConcurrentDrains(): number {
  return useSettingsStore.getState().privateRemoteQueueConcurrency;
}

function acquireDrainSlot(): Promise<void> {
  const maxConcurrent = getMaxConcurrentDrains();
  if (activeDrains < maxConcurrent) {
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

async function ensureQueuedUiIfTaskRemains(task: PrivateAiQueuedTask): Promise<void> {
  const row = await getPrivateAiTaskById(task.id);
  if (!row) return;

  const record = useRecordStore.getState().records.find((r) => r.id === task.recordId);
  if (!record) return;
  if (record.summaryStatus === 'processing' || record.tasksStatus === 'processing') return;

  useRecordStore.getState().setSummaryStatus(task.recordId, 'queued');
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

      hydratePrivateRemoteWorkingConfig();
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
      await ensureQueuedUiIfTaskRemains(task);
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

export type DrainQueueResult = 'completed' | 'server_unreachable' | 'inactive';

export type DrainPrivateAiTaskQueueOptions = {
  /** Called after each task finishes (`current` is completed count, 0..total). */
  onProgress?: (current: number, total: number) => void;
  /** Fresh health check before draining (manual Run / Run all). */
  forceReachabilityCheck?: boolean;
};

export async function drainPrivateAiTaskQueue(
  options?: DrainPrivateAiTaskQueueOptions,
): Promise<DrainQueueResult> {
  if (!isPrivateServerAutomationActive()) return 'inactive';

  try {
    await waitForDb();
  } catch {
    return 'inactive';
  }

  hydratePrivateRemoteWorkingConfig();
  const reachable = await isPrivateRemoteServerReachable({
    forceRefresh: options?.forceReachabilityCheck === true,
  });
  if (!reachable) return 'server_unreachable';

  const tasks = await listPrivateAiTasks();
  await drainTasksWithConcurrency(tasks, options?.onProgress);
  return 'completed';
}

async function drainTasksWithConcurrency(
  tasks: PrivateAiQueuedTask[],
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const total = tasks.length;
  if (total === 0) return;

  let completed = 0;
  let nextIndex = 0;
  const workerCount = Math.min(getMaxConcurrentDrains(), total);

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      if (index >= total) return;
      nextIndex += 1;
      await runDrainTask(tasks[index]!);
      completed += 1;
      onProgress?.(completed, total);
    }
  };

  onProgress?.(0, total);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

export async function drainSinglePrivateAiTask(taskId: string): Promise<DrainQueueResult> {
  if (!isPrivateServerAutomationActive()) return 'inactive';

  try {
    await waitForDb();
  } catch {
    return 'inactive';
  }

  const tasks = await listPrivateAiTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return 'inactive';

  hydratePrivateRemoteWorkingConfig();
  const reachable = await isPrivateRemoteServerReachable({ forceRefresh: true });
  if (!reachable) {
    await markPrivateAiTaskAttempt(task.id, 'server_unreachable');
    return 'server_unreachable';
  }

  await runDrainTask(task);
  return 'completed';
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
      .catch((): DrainQueueResult => 'inactive')
      .finally(() => {
        drainAllInFlight = null;
      });
  }, FOREGROUND_DRAIN_DEBOUNCE_MS);
}
