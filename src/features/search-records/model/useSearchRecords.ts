import { useMemo, useState } from 'react';

import type { VoiceRecord } from '@/entities/record';

export const useSearchRecords = (records: VoiceRecord[]) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      return records;
    }

    return records.filter(
      (r) =>
        r.title.toLowerCase().includes(trimmed) ||
        r.transcript?.toLowerCase().includes(trimmed) ||
        r.tags?.some((tag) => tag.toLowerCase().includes(trimmed)),
    );
  }, [records, query]);

  const pinned = useMemo(() => filtered.filter((r) => r.isPinned), [filtered]);
  const all = useMemo(() => filtered.filter((r) => !r.isPinned), [filtered]);

  const sections = useMemo(
    () => [
      ...(pinned.length > 0 ? [{ title: 'Закреплённые', data: pinned }] : []),
      ...(all.length > 0
        ? [{ title: query.trim() ? 'Результаты поиска' : 'Все записи', data: all }]
        : []),
    ],
    [pinned, all, query],
  );

  return { query, setQuery, filtered, sections, isSearching: query.trim().length > 0 };
};
