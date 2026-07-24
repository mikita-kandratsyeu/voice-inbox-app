import type { TaskItem } from '@/entities/record';
import { isString } from '@/shared/lib/type-guards';

import { TASK_DEADLINE_NOTIFICATION_TYPE } from './constants';

export type TaskDeadlineSheetPayload = {
  recordId: string;
  taskId: string;
  taskText: string;
  recordTitle: string;
  deadline: string;
  deadlineTime: string | null;
  isDone: boolean;
};

export function extractTaskDeadlineNotificationIds(
  data: Record<string, string | number | object> | undefined,
): { recordId: string; taskId: string } | null {
  if (!data || data.type !== TASK_DEADLINE_NOTIFICATION_TYPE) return null;

  const recordId = isString(data.recordId) ? data.recordId.trim() : '';
  const taskId = isString(data.taskId) ? data.taskId.trim() : '';
  if (!recordId || !taskId) return null;

  return { recordId, taskId };
}

export function resolveTaskDeadlineSheetPayload(
  data: Record<string, string | number | object> | undefined,
  findRecord: (
    recordId: string,
  ) => { id: string; title: string; tasks?: TaskItem[] | null } | undefined,
): TaskDeadlineSheetPayload | null {
  const ids = extractTaskDeadlineNotificationIds(data);
  if (!ids) return null;

  const record = findRecord(ids.recordId);
  const task = record?.tasks?.find((item) => item.id === ids.taskId);
  if (!record || !task?.deadline) return null;

  return {
    recordId: ids.recordId,
    taskId: ids.taskId,
    taskText: task.text.trim(),
    recordTitle: record.title,
    deadline: task.deadline,
    deadlineTime: task.deadlineTime ?? null,
    isDone: task.isDone,
  };
}
