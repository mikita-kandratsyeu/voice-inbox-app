import type { TaskItem } from '@/entities/record';
import { getTaskDeadlineTimestamp } from '@/shared/lib/taskDeadlineTimestamp';

import { clearTaskDeadlineSnooze, setTaskDeadlineSnooze } from './taskDeadlineSnoozeStorage';

function shouldSyncSnooze(prev: TaskItem | undefined, next: TaskItem): boolean {
  return (
    prev?.deadline !== next.deadline ||
    prev?.deadlineTime !== next.deadlineTime ||
    prev?.isDone !== next.isDone
  );
}

/** Keeps snooze storage aligned with task deadline fields after task updates. */
export function syncTaskDeadlineSnoozeForTasks(
  prevTasks: ReadonlyArray<TaskItem> | null | undefined,
  nextTasks: ReadonlyArray<TaskItem>,
  nowMs: number = Date.now(),
): void {
  const prevById = new Map((prevTasks ?? []).map((task) => [task.id, task]));

  for (const task of nextTasks) {
    const prev = prevById.get(task.id);
    if (!shouldSyncSnooze(prev, task)) continue;

    if (task.isDone || !task.deadline) {
      clearTaskDeadlineSnooze(task.id);
      continue;
    }

    const triggerAt = getTaskDeadlineTimestamp(task.deadline, task.deadlineTime, nowMs);
    if (triggerAt != null) {
      setTaskDeadlineSnooze(task.id, triggerAt);
    } else {
      clearTaskDeadlineSnooze(task.id);
    }
  }
}
