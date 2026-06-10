import type { TaskItem } from '@/entities/record';
import { getTaskDeadlineTimestamp } from '@/shared/lib/taskDeadlineTimestamp';

import { resolveTaskDeadlineTriggerAt } from './resolveTaskDeadlineTriggerAt';
import type { TaskDeadlineSnoozeMap } from './taskDeadlineSnoozeStorage';

export type SchedulableTaskDeadline = {
  recordId: string;
  recordTitle: string;
  task: TaskItem;
  triggerAt: number;
};

export function collectSchedulableTaskDeadlines(
  records: ReadonlyArray<{ id: string; title: string; tasks?: TaskItem[] | null }>,
  nowMs: number = Date.now(),
  snoozeByTaskId: Readonly<TaskDeadlineSnoozeMap> = {},
): SchedulableTaskDeadline[] {
  const out: SchedulableTaskDeadline[] = [];

  for (const record of records) {
    const tasks = record.tasks;
    if (!tasks?.length) continue;

    for (const task of tasks) {
      if (task.isDone || !task.deadline) continue;

      const deadlineAt = getTaskDeadlineTimestamp(task.deadline, task.deadlineTime, nowMs);
      const triggerAt = resolveTaskDeadlineTriggerAt(
        deadlineAt,
        snoozeByTaskId[task.id],
        nowMs,
      );
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
