import type { TaskItem } from '@/entities/record';

export type TaskWithRecord = {
  recordId: string;
  recordTitle: string;
  recordCreatedAt: string;
  task: TaskItem;
};

export type TaskDeadlineBucket =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'thisWeek'
  | 'later'
  | 'noDate'
  | 'done';

export type AllTasksQuickFilter =
  | 'all'
  | 'overdue'
  | 'today'
  | 'highPriority'
  | 'noDate'
  | 'done';
