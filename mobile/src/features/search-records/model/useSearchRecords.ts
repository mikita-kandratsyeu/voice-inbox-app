import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { VoiceRecord } from '@/entities/record';

export const useSearchRecords = (records: VoiceRecord[]) => {
  const { t } = useTranslation();
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
      ...(pinned.length > 0 ? [{ title: t('inbox.pinned'), data: pinned }] : []),
      ...(all.length > 0
        ? [
            {
              title: query.trim() ? t('inbox.searchResults') : t('inbox.allRecords'),
              data: all,
            },
          ]
        : []),
    ],
    [pinned, all, query, t],
  );

  return { query, setQuery, filtered, sections, isSearching: query.trim().length > 0 };
};
