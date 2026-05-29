import type { RecordListItem } from '@/entities/record';

import {
  collectTabletSidebarAiProcessing,
  resolveTabletSidebarAiTarget,
} from '../collectTabletSidebarAiProcessing';

describe('resolveTabletSidebarAiTarget', () => {
  it('maps archived records to archived nav', () => {
    expect(
      resolveTabletSidebarAiTarget({ status: 'archived', folderId: 'f1', isPinned: true }),
    ).toEqual({ kind: 'archived' });
  });

  it('maps folder records to folder nav', () => {
    expect(
      resolveTabletSidebarAiTarget({ status: 'read', folderId: 'f1', isPinned: false }),
    ).toEqual({
      kind: 'folder',
      folderId: 'f1',
    });
  });

  it('maps pinned records without folder to pinned nav', () => {
    expect(
      resolveTabletSidebarAiTarget({ status: 'read', folderId: null, isPinned: true }),
    ).toEqual({
      kind: 'pinned',
    });
  });

  it('maps plain inbox records to inbox nav', () => {
    expect(
      resolveTabletSidebarAiTarget({ status: 'unread', folderId: undefined, isPinned: false }),
    ).toEqual({
      kind: 'inbox',
    });
  });
});

describe('collectTabletSidebarAiProcessing', () => {
  it('places active ai jobs on the matching sidebar targets', () => {
    const result = collectTabletSidebarAiProcessing([
      { id: '1', status: 'archived', aiStatus: 'processing' },
      { id: '2', status: 'read', folderId: 'work', summaryStatus: 'processing' },
      { id: '3', status: 'read', isPinned: true, askAiStatus: 'processing' },
      { id: '4', status: 'read', aiStatus: 'processing' },
      { id: '5', status: 'read', summaryStatus: 'done' },
    ] as RecordListItem[]);

    expect(result.archived).toBe(true);
    expect(result.archivedKind).toBe('transcription');
    expect(result.folderIds).toEqual(new Set(['work']));
    expect(result.folderKinds.get('work')).toBe('summary');
    expect(result.pinned).toBe(true);
    expect(result.pinnedKind).toBe('ask');
    expect(result.inbox).toBe(true);
    expect(result.inboxKind).toBe('transcription');
  });

  it('tracks speaker breakdown on the matching folder', () => {
    const result = collectTabletSidebarAiProcessing([
      {
        id: '1',
        status: 'read',
        folderId: 'work',
        meetingDialogueStatus: 'processing',
      },
    ] as RecordListItem[]);

    expect(result.folderIds).toEqual(new Set(['work']));
    expect(result.folderKinds.get('work')).toBe('speakers');
  });
});
