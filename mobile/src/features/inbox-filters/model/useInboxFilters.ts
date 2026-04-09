import dayjs from 'dayjs';
import { useCallback, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';

import type { InboxFilterStatus, InboxMenuFilterStatus, InboxSortOption } from './types';

const parseDurationMs = (record: VoiceRecord): number => {
  return record.durationMs ?? 0;
};

const sortFns: Record<InboxSortOption, (a: VoiceRecord, b: VoiceRecord) => number> = {
  dateDesc: (a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf(),
  dateAsc: (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
  durationDesc: (a, b) => parseDurationMs(b) - parseDurationMs(a),
  durationAsc: (a, b) => parseDurationMs(a) - parseDurationMs(b),
  titleAsc: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
};

export const useInboxFilters = () => {
  const [filterStatus, setFilterStatus] = useState<InboxFilterStatus>('all');
  const [menuFilterStatus, setMenuFilterStatus] = useState<InboxMenuFilterStatus | null>(null);
  const [sortOption, setSortOption] = useState<InboxSortOption>('dateDesc');

  const filterRecords = useCallback(
    (records: VoiceRecord[]): VoiceRecord[] => {
      let result = records;

      if (filterStatus === 'archived') {
        result = result.filter((r) => r.status === 'archived');
      } else {
        result = result.filter((r) => r.status !== 'archived');

        if (filterStatus === 'pinned') {
          result = result.filter((r) => r.isPinned);
        } else if (filterStatus !== 'all') {
          result = result.filter((r) => r.status === filterStatus);
        }
      }

      if (menuFilterStatus === 'withoutTranscript') {
        result = result.filter((r) => !r.transcript?.trim());
      } else if (menuFilterStatus === 'unread') {
        result = result.filter((r) => r.status === 'unread');
      } else if (menuFilterStatus === 'withoutSummary') {
        result = result.filter((r) => !r.summary?.trim());
      } else if (menuFilterStatus === 'withoutTasks') {
        result = result.filter((r) => !r.tasks || r.tasks.length === 0);
      } else if (menuFilterStatus === 'withTasks') {
        result = result.filter((r) => Boolean(r.tasks && r.tasks.length > 0));
      } else if (menuFilterStatus === 'processingError') {
        result = result.filter(
          (r) =>
            r.aiStatus === 'error' ||
            r.summaryStatus === 'error' ||
            r.tasksStatus === 'error' ||
            r.askAiStatus === 'error',
        );
      }

      return [...result].sort(sortFns[sortOption]);
    },
    [filterStatus, menuFilterStatus, sortOption],
  );

  return {
    filterStatus,
    setFilterStatus,
    menuFilterStatus,
    setMenuFilterStatus,
    sortOption,
    setSortOption,
    filterRecords,
  };
};
