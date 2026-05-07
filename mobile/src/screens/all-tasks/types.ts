import type { TaskItem } from '@/entities/record';

export type TaskWithRecord = {
  recordId: string;
  recordTitle: string;
  recordCreatedAt: string;
  task: TaskItem;
};

export type TaskDeadlineBucket = 'overdue' | 'today' | 'upcoming' | 'noDate' | 'done';
