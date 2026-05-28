import { useMemo } from 'react';

import { useRecordStore } from '@/entities/record';

export type TabletSidebarNavCounts = {
  pinned: number;
  archived: number;
  folderCounts: Map<string, number>;
};

export function useTabletSidebarNavCounts(): TabletSidebarNavCounts {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => {
    let pinned = 0;
    let archived = 0;
    const folderCounts = new Map<string, number>();

    for (const record of records) {
      if (record.status === 'archived') {
        archived += 1;
        continue;
      }
      if (record.isPinned) {
        pinned += 1;
      }
      if (record.folderId) {
        folderCounts.set(record.folderId, (folderCounts.get(record.folderId) ?? 0) + 1);
      }
    }

    return { pinned, archived, folderCounts };
  }, [records]);
}

export function formatTabletSidebarBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}
