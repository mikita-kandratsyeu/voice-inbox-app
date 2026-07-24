import dayjs from 'dayjs';

import type { RecordListItem } from '@/entities/record';

import type { AllTasksQuickFilter, TaskWithRecord } from '../types';
import { applyAllTasksQuickFilter } from './applyAllTasksQuickFilter';

type BuildAllTasksRowsOptions = {
  effectiveActiveFolderId: string | null;
  recordFilterId?: string;
  quickFilter: AllTasksQuickFilter;
  recentlyCompleted: Set<string>;
};

export function buildAllTasksRows(
  records: RecordListItem[],
  {
    effectiveActiveFolderId,
    recordFilterId,
    quickFilter,
    recentlyCompleted,
  }: BuildAllTasksRowsOptions,
): TaskWithRecord[] {
  let pool = [...records]
    .filter((r) => r.status !== 'archived')
    .filter((r) => (r.tasks?.length ?? 0) > 0);

  if (effectiveActiveFolderId) {
    pool = pool.filter((r) => r.folderId === effectiveActiveFolderId);
  }
  if (recordFilterId) {
    pool = pool.filter((r) => r.id === recordFilterId);
  }

  const sorted = pool.sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

  const rows: TaskWithRecord[] = [];
  for (const r of sorted) {
    for (const task of r.tasks ?? []) {
      rows.push({
        recordId: r.id,
        recordTitle: r.title,
        recordCreatedAt: r.createdAt,
        task,
      });
    }
  }

  return applyAllTasksQuickFilter(rows, quickFilter, recentlyCompleted);
}
