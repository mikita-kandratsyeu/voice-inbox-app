import { useCallback, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';

import type { InboxFilterStatus, InboxSortOption } from './types';

const parseDurationMs = (record: VoiceRecord): number => {
  return record.durationMs ?? 0;
};

const sortFns: Record<InboxSortOption, (a: VoiceRecord, b: VoiceRecord) => number> = {
  dateDesc: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  dateAsc: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  durationDesc: (a, b) => parseDurationMs(b) - parseDurationMs(a),
  durationAsc: (a, b) => parseDurationMs(a) - parseDurationMs(b),
  titleAsc: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
};

export const useInboxFilters = () => {
  const [filterStatus, setFilterStatus] = useState<InboxFilterStatus>('all');
  const [sortOption, setSortOption] = useState<InboxSortOption>('dateDesc');

  const filterRecords = useCallback(
    (records: VoiceRecord[]): VoiceRecord[] => {
      let result = records;

      if (filterStatus === 'pinned') {
        result = result.filter((r) => r.isPinned);
      } else if (filterStatus === 'withoutTranscript') {
        result = result.filter((r) => !r.transcript?.trim());
      } else if (filterStatus === 'withoutSummary') {
        result = result.filter((r) => !r.summary?.trim());
      } else if (filterStatus !== 'all') {
        result = result.filter((r) => r.status === filterStatus);
      }

      return [...result].sort(sortFns[sortOption]);
    },
    [filterStatus, sortOption],
  );

  return {
    filterStatus,
    setFilterStatus,
    sortOption,
    setSortOption,
    filterRecords,
  };
};
