import type { RecordListItem } from '@/entities/record';

import {
  classifySidebarRecordAiOperation,
  pickDominantSidebarAiOperationKind,
  type TabletSidebarAiOperationKind,
} from './classifySidebarRecordAiOperation';
import type { TabletInboxSidebarTarget } from './tabletInboxNavBridge';

export type { TabletSidebarAiOperationKind } from './classifySidebarRecordAiOperation';

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
  inboxKind: TabletSidebarAiOperationKind | null;
  pinned: boolean;
  pinnedKind: TabletSidebarAiOperationKind | null;
  archived: boolean;
  archivedKind: TabletSidebarAiOperationKind | null;
  folderIds: ReadonlySet<string>;
  folderKinds: ReadonlyMap<string, TabletSidebarAiOperationKind>;
};

export function collectTabletSidebarAiProcessing(
  records: ReadonlyArray<RecordListItem>,
): TabletSidebarAiProcessing {
  const inboxKinds: TabletSidebarAiOperationKind[] = [];
  const pinnedKinds: TabletSidebarAiOperationKind[] = [];
  const archivedKinds: TabletSidebarAiOperationKind[] = [];
  const folderKindsList = new Map<string, TabletSidebarAiOperationKind[]>();

  for (const record of records) {
    const kind = classifySidebarRecordAiOperation(record);
    if (!kind) continue;

    const target = resolveTabletSidebarAiTarget(record);
    switch (target.kind) {
      case 'inbox':
        inboxKinds.push(kind);
        break;
      case 'pinned':
        pinnedKinds.push(kind);
        break;
      case 'archived':
        archivedKinds.push(kind);
        break;
      case 'folder': {
        const list = folderKindsList.get(target.folderId) ?? [];
        list.push(kind);
        folderKindsList.set(target.folderId, list);
        break;
      }
    }
  }

  const folderKinds = new Map<string, TabletSidebarAiOperationKind>();
  for (const [folderId, kinds] of folderKindsList) {
    const dominant = pickDominantSidebarAiOperationKind(kinds);
    if (dominant) {
      folderKinds.set(folderId, dominant);
    }
  }

  return {
    inbox: inboxKinds.length > 0,
    inboxKind: pickDominantSidebarAiOperationKind(inboxKinds),
    pinned: pinnedKinds.length > 0,
    pinnedKind: pickDominantSidebarAiOperationKind(pinnedKinds),
    archived: archivedKinds.length > 0,
    archivedKind: pickDominantSidebarAiOperationKind(archivedKinds),
    folderIds: new Set(folderKinds.keys()),
    folderKinds,
  };
}
