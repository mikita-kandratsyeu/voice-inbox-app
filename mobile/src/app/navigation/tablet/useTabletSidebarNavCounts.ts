import { useMemo } from 'react';

import { useRecordStore } from '@/entities/record';
import { countGraphNodes } from '@/screens/notes-graph/lib/buildGraphModel';
import { DEFAULT_NOTES_GRAPH_FILTERS } from '@/screens/notes-graph/lib/notesGraphLayoutCache';

export type TabletSidebarNavCounts = {
  inbox: number;
  unread: number;
  pinned: number;
  archived: number;
  openTasks: number;
  notesGraphNodes: number;
  folderCounts: Map<string, number>;
};

export function useTabletSidebarNavCounts(): TabletSidebarNavCounts {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => {
    let inbox = 0;
    let unread = 0;
    let pinned = 0;
    let archived = 0;
    let openTasks = 0;
    const folderCounts = new Map<string, number>();

    for (const record of records) {
      if (record.status === 'archived') {
        archived += 1;
        continue;
      }
      inbox += 1;
      if (record.status === 'unread') {
        unread += 1;
      }
      if (record.isPinned) {
        pinned += 1;
      }
      if (record.folderId) {
        folderCounts.set(record.folderId, (folderCounts.get(record.folderId) ?? 0) + 1);
      }
      for (const task of record.tasks ?? []) {
        if (!task.isDone) {
          openTasks += 1;
        }
      }
    }

    const notesGraphNodes = countGraphNodes(records, DEFAULT_NOTES_GRAPH_FILTERS);

    return { inbox, unread, pinned, archived, openTasks, notesGraphNodes, folderCounts };
  }, [records]);
}

export function formatTabletSidebarBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}
