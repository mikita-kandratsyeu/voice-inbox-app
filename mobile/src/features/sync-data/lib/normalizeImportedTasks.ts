import type { TaskItem } from '@/entities/record';
import { isArray, isBoolean, isRecord, isString } from '@/shared/lib/type-guards';

const TASK_PRIORITIES = new Set<TaskItem['priority']>(['high', 'medium', 'low']);
const TASK_SOURCES = new Set<NonNullable<TaskItem['source']>>(['manual', 'ai']);

export function normalizeImportedTasks(raw: unknown): TaskItem[] | undefined {
  if (!isArray(raw) || raw.length === 0) {
    return undefined;
  }

  const out: TaskItem[] = [];
  for (const item of raw) {
    if (!isRecord(item) || !isString(item.id) || !isString(item.text)) {
      continue;
    }

    const text = item.text.trim();
    if (!text) continue;

    const task: TaskItem = {
      id: item.id.trim(),
      text,
      isDone: isBoolean(item.isDone) ? item.isDone : false,
    };

    if (isString(item.deadline)) {
      const deadline = item.deadline.trim();
      task.deadline = deadline.length > 0 ? deadline : null;
    }

    if (isString(item.deadlineTime)) {
      const deadlineTime = item.deadlineTime.trim();
      task.deadlineTime = deadlineTime.length > 0 ? deadlineTime : null;
    }

    if (isString(item.priority) && TASK_PRIORITIES.has(item.priority as TaskItem['priority'])) {
      task.priority = item.priority as TaskItem['priority'];
    }

    if (isString(item.source) && TASK_SOURCES.has(item.source as NonNullable<TaskItem['source']>)) {
      task.source = item.source as NonNullable<TaskItem['source']>;
    }

    out.push(task);
  }

  return out.length > 0 ? out : undefined;
}
