import type { InboxFilterStatus } from '@/features/inbox-filters';

export type TabletInboxSidebarTarget =
  | { kind: 'inbox' }
  | { kind: 'pinned' }
  | { kind: 'archived' }
  | { kind: 'folder'; folderId: string };

export type TabletInboxSidebarApply = (target: TabletInboxSidebarTarget) => void;

let applyHandler: TabletInboxSidebarApply | null = null;
let pendingTarget: TabletInboxSidebarTarget | null = null;
let createFolderHandler: (() => void) | null = null;
let editFolderHandler: ((folderId: string) => void) | null = null;

export function requestTabletOpenCreateFolder(): void {
  createFolderHandler?.();
}

export function registerTabletOpenCreateFolderHandler(handler: (() => void) | null): () => void {
  createFolderHandler = handler;
  return () => {
    if (createFolderHandler === handler) {
      createFolderHandler = null;
    }
  };
}

export function requestTabletOpenEditFolder(folderId: string): void {
  editFolderHandler?.(folderId);
}

export function registerTabletOpenEditFolderHandler(
  handler: ((folderId: string) => void) | null,
): () => void {
  editFolderHandler = handler;
  return () => {
    if (editFolderHandler === handler) {
      editFolderHandler = null;
    }
  };
}

export function requestTabletInboxSidebarNav(target: TabletInboxSidebarTarget): void {
  pendingTarget = target;
  applyHandler?.(target);
}

export function registerTabletInboxSidebarNavHandler(
  handler: TabletInboxSidebarApply | null,
): () => void {
  applyHandler = handler;
  if (pendingTarget) {
    handler?.(pendingTarget);
    pendingTarget = null;
  }

  return () => {
    if (applyHandler === handler) {
      applyHandler = null;
    }
  };
}

export function mapTabletSidebarTargetToFilter(
  target: TabletInboxSidebarTarget,
): InboxFilterStatus {
  switch (target.kind) {
    case 'pinned':
      return 'pinned';
    case 'archived':
      return 'archived';
    default:
      return 'all';
  }
}
