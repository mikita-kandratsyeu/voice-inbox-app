import dayjs from 'dayjs';

import { parseTaskDeadline } from '@/shared/lib/parseTaskDeadline';

import type { TaskWithRecord } from '../types';

export function filterTasksByCalendarDate(rows: TaskWithRecord[], date: Date): TaskWithRecord[] {
  const target = dayjs(date).startOf('day');

  return rows.filter((row) => {
    const deadline = parseTaskDeadline(row.task.deadline);
    if (!deadline) return false;
    return dayjs(deadline).startOf('day').isSame(target);
  });
}
