import type { TaskItem } from '@/entities/record';
import { getTaskDeadlineTimestamp } from '@/shared/lib/taskDeadlineTimestamp';

export type SchedulableTaskDeadline = {
  recordId: string;
  recordTitle: string;
  task: TaskItem;
  triggerAt: number;
};

export function collectSchedulableTaskDeadlines(
  records: ReadonlyArray<{ id: string; title: string; tasks?: TaskItem[] | null }>,
  nowMs: number = Date.now(),
): SchedulableTaskDeadline[] {
  const out: SchedulableTaskDeadline[] = [];

  for (const record of records) {
    const tasks = record.tasks;
    if (!tasks?.length) continue;

    for (const task of tasks) {
      if (task.isDone || !task.deadline) continue;

      const triggerAt = getTaskDeadlineTimestamp(task.deadline, task.deadlineTime, nowMs);
      if (triggerAt == null) continue;

      out.push({
        recordId: record.id,
        recordTitle: record.title,
        task,
        triggerAt,
      });
    }
  }

  out.sort((a, b) => a.triggerAt - b.triggerAt);
  return out;
}
