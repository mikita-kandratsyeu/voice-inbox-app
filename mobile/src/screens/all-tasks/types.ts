import type { TaskItem } from '@/entities/record';

export type TaskWithRecord = {
  recordId: string;
  recordTitle: string;
  recordCreatedAt: string;
  task: TaskItem;
};
