import type { RecordListItem } from '@/entities/record';
import { isRecordAiOperating } from '@/entities/record/lib/isRecordAiOperating';

import type { TabletInboxSidebarTarget } from './tabletInboxNavBridge';

export function resolveTabletSidebarAiTarget(
  record: Pick<RecordListItem, 'status' | 'folderId' | 'isPinned'>,
): TabletInboxSidebarTarget {
  if (record.status === 'archived') {
    return { kind: 'archived' };
  }
  if (record.folderId) {
    return { kind: 'folder', folderId: record.folderId };
  }
  if (record.isPinned) {
    return { kind: 'pinned' };
  }
  return { kind: 'inbox' };
}

export type TabletSidebarAiProcessing = {
  inbox: boolean;
  pinned: boolean;
  archived: boolean;
  folderIds: ReadonlySet<string>;
};

export function collectTabletSidebarAiProcessing(
  records: ReadonlyArray<RecordListItem>,
): TabletSidebarAiProcessing {
  const folderIds = new Set<string>();
  let inbox = false;
  let pinned = false;
  let archived = false;

  for (const record of records) {
    if (!isRecordAiOperating(record)) continue;

    const target = resolveTabletSidebarAiTarget(record);
    switch (target.kind) {
      case 'inbox':
        inbox = true;
        break;
      case 'pinned':
        pinned = true;
        break;
      case 'archived':
        archived = true;
        break;
      case 'folder':
        folderIds.add(target.folderId);
        break;
    }
  }

  return { inbox, pinned, archived, folderIds };
}
