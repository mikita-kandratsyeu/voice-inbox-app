import { useRecordStore } from '@/entities/record';

import { listPrivateAiTasks } from './privateAiTaskQueueDb';

/** Align in-memory `summaryStatus` with rows in `private_ai_task_queue` (not persisted). */
export async function syncPrivateAiQueueRecordStatuses(): Promise<void> {
  const tasks = await listPrivateAiTasks();
  const queuedRecordIds = new Set(tasks.map((task) => task.recordId));
  const { records, setSummaryStatus } = useRecordStore.getState();

  for (const task of tasks) {
    const record = records.find((r) => r.id === task.recordId);
    if (!record) continue;
    if (record.summaryStatus === 'processing' || record.tasksStatus === 'processing') continue;
    if (record.summary?.trim() && record.summaryStatus === 'done') continue;
    setSummaryStatus(task.recordId, 'queued');
  }

  for (const record of records) {
    if (record.summaryStatus === 'queued' && !queuedRecordIds.has(record.id)) {
      setSummaryStatus(record.id, 'idle');
    }
  }
}
