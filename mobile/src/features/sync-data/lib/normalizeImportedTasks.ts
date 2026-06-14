import type { TaskItem } from '@/entities/record';
import { normalizeTaskDeadlineFields } from '@/shared/lib/normalizeTaskDeadlineFields';
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
      const normalized = normalizeTaskDeadlineFields(item.deadline);
      if (normalized) {
        task.deadline = normalized.deadline;
        if (normalized.deadlineTime) {
          task.deadlineTime = normalized.deadlineTime;
        }
      }
    }

    if (isString(item.deadlineTime) && task.deadlineTime == null) {
      const deadlineTime = item.deadlineTime.trim();
      task.deadlineTime = deadlineTime.length > 0 ? deadlineTime : null;
    }

    if (isString(item.priority) && TASK_PRIORITIES.has(item.priority as TaskItem['priority'])) {
      task.priority = item.priority as TaskItem['priority'];
    }

    if (isString(item.source) && TASK_SOURCES.has(item.source as NonNullable<TaskItem['source']>)) {
      task.source = item.source as NonNullable<TaskItem['source']>;
    }

    if (isString(item.completedAt)) {
      const completedAt = item.completedAt.trim();
      task.completedAt = completedAt.length > 0 ? completedAt : null;
    }

    if (isString(item.outcomeText)) {
      const outcomeText = item.outcomeText.trim();
      task.outcomeText = outcomeText.length > 0 ? outcomeText : null;
    }

    if (isString(item.outcomeRecordId)) {
      const outcomeRecordId = item.outcomeRecordId.trim();
      task.outcomeRecordId = outcomeRecordId.length > 0 ? outcomeRecordId : null;
    }

    out.push(task);
  }

  return out.length > 0 ? out : undefined;
}
