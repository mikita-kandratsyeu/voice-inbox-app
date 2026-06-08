import dayjs from 'dayjs';

import type { TaskItem } from '@/entities/record';
import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

import type { AllTasksQuickFilter, TaskWithRecord } from '../types';
import { getTaskDeadlineBucket } from './groupTasksByDeadlineBucket';

function matchesQuickFilter(row: TaskWithRecord, filter: AllTasksQuickFilter): boolean {
  const { task } = row;

  switch (filter) {
    case 'all':
      return true;
    case 'overdue':
      return !task.isDone && getTaskDeadlineBucket(task) === 'overdue';
    case 'today':
      return !task.isDone && getTaskDeadlineBucket(task) === 'today';
    case 'highPriority':
      return !task.isDone && task.priority === 'high';
    case 'noDate':
      return !task.isDone && getTaskDeadlineBucket(task) === 'noDate';
    case 'done':
      return task.isDone;
    default:
      return true;
  }
}

export function applyAllTasksQuickFilter(
  rows: TaskWithRecord[],
  quickFilter: AllTasksQuickFilter,
  recentlyCompleted: Set<string>,
): TaskWithRecord[] {
  let filtered = rows.filter((row) => matchesQuickFilter(row, quickFilter));

  if (quickFilter === 'done') {
    return filtered;
  }

  filtered = filtered.filter((row) => !row.task.isDone || recentlyCompleted.has(row.task.id));

  return filtered;
}

export function getTaskDeadlineSortTime(task: TaskItem): number {
  const deadline = parseTaskDeadline(task.deadline);
  if (!deadline) return Number.POSITIVE_INFINITY;

  const match = /^(\d{2}):(\d{2})$/.exec(task.deadlineTime ?? '');
  if (!match) return deadline.getTime();

  return new Date(
    deadline.getFullYear(),
    deadline.getMonth(),
    deadline.getDate(),
    Number(match[1]),
    Number(match[2]),
  ).getTime();
}

const PRIORITY_RANK: Record<NonNullable<TaskItem['priority']>, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortTaskRows(a: TaskWithRecord, b: TaskWithRecord): number {
  const deadlineA = getTaskDeadlineSortTime(a.task);
  const deadlineB = getTaskDeadlineSortTime(b.task);
  if (deadlineA !== deadlineB) return deadlineA - deadlineB;

  const priorityA = a.task.priority ? PRIORITY_RANK[a.task.priority] : PRIORITY_RANK.medium;
  const priorityB = b.task.priority ? PRIORITY_RANK[b.task.priority] : PRIORITY_RANK.medium;
  if (priorityA !== priorityB) return priorityA - priorityB;

  return dayjs(b.recordCreatedAt).valueOf() - dayjs(a.recordCreatedAt).valueOf();
}
