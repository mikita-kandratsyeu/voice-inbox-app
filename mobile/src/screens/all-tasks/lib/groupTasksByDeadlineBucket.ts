import dayjs from 'dayjs';

import type { TaskItem } from '@/entities/record';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

import type { TaskDeadlineBucket } from '../types';

export function getTaskDeadlineBucket(task: TaskItem): TaskDeadlineBucket {
  if (task.isDone) return 'done';

  const deadline = parseTaskDeadline(task.deadline);
  if (!deadline) return 'noDate';

  const day = dayjs(deadline).startOf('day');
  const today = dayjs().startOf('day');

  if (day.isBefore(today)) return 'overdue';
  if (day.isSame(today)) return 'today';
  if (day.isSame(today.add(1, 'day'))) return 'tomorrow';

  const endOfWeek = today.endOf('week');
  if (day.isAfter(today.add(1, 'day')) && !day.isAfter(endOfWeek, 'day')) {
    return 'thisWeek';
  }

  return 'later';
}

export function getAllTasksListBucket(task: TaskItem): TaskDeadlineBucket {
  if (task.isPinned && !task.isDone) return 'pinned';
  return getTaskDeadlineBucket(task);
}

export const TASK_DEADLINE_BUCKET_ORDER: TaskDeadlineBucket[] = [
  'pinned',
  'overdue',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
  'noDate',
  'done',
];
