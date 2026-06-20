import type { RemoteSnapshot } from '@/features/git-remote-sync/lib/buildRemoteSnapshot';
import {
  areRemoteSyncHashesEqual,
  computeRemoteSyncDiff,
} from '@/features/git-remote-sync/lib/computeRemoteSyncDiff';
import {
  type FileSyncPushAdapter,
  pushFileSnapshot,
} from '@/features/git-remote-sync/lib/pushFileSnapshot';

function createMockAdapter(overrides: Partial<FileSyncPushAdapter> = {}): FileSyncPushAdapter {
  return {
    basePath: 'voice-inbox-ai',
    buildSnapshot: jest.fn(),
    listExistingRelativePaths: jest.fn(async () => []),
    writeFiles: jest.fn(async () => {}),
    pruneOldVersions: jest.fn(async () => {}),
    getPreviousHashes: () => ({}),
    areHashesEqual: areRemoteSyncHashesEqual,
    getLastVersionId: () => null,
    setLastVersionId: jest.fn(),
    setLastSyncedAt: jest.fn(),
    setContentHashes: jest.fn(),
    setLastError: jest.fn(),
    formatVersionLabel: () => 'Voice Inbox AI backup',
    ...overrides,
  };
}

const mockSnapshot = (hashes: Record<string, string>): RemoteSnapshot => ({
  files: new Map(Object.entries(hashes).map(([path, hash]) => [path, hash])),
  contentHashes: hashes,
  manifest: {
    version: 4,
    exportedAt: '2026-06-20T12:00:00.000Z',
    folders: [],
    records: [],
    graphLayouts: [],
    syncMeta: { appVersion: '1', deviceIdHash: 'abc', contentHashes: hashes },
  },
  index: {
    structureVersion: 3,
    exportedAt: '2026-06-20T12:00:00.000Z',
    notesPath: 'notes',
    records: {},
  },
  recordCount: 1,
  folderCount: 0,
  graphLayoutCount: 0,
});

describe('pushFileSnapshot', () => {
  it('returns alreadyUpToDate when hashes match', async () => {
    const hashes = { 'voice-inbox-ai/notes/a.md': 'hash-a' };
    const adapter = createMockAdapter({
      getPreviousHashes: () => hashes,
      getLastVersionId: () => 'prev-version',
      buildSnapshot: jest.fn(async () => mockSnapshot(hashes)),
    });

    const result = await pushFileSnapshot({
      records: [],
      folders: [],
      adapter,
      isProActive: () => true,
      withTimeout: async (p) => p,
      isTimeoutError: () => false,
      timeoutErrorMessage: 'timeout',
    });

    expect(result).toEqual({ ok: true, versionId: 'prev-version', alreadyUpToDate: true });
    expect(adapter.writeFiles).not.toHaveBeenCalled();
  });

  it('writes files when hashes changed', async () => {
    const previous = { 'voice-inbox-ai/notes/old.md': 'old-hash' };
    const current = { 'voice-inbox-ai/notes/new.md': 'new-hash' };
    const adapter = createMockAdapter({
      getPreviousHashes: () => previous,
      buildSnapshot: jest.fn(async () => mockSnapshot(current)),
    });

    const result = await pushFileSnapshot({
      records: [],
      folders: [],
      adapter,
      isProActive: () => true,
      withTimeout: async (p) => p,
      isTimeoutError: () => false,
      timeoutErrorMessage: 'timeout',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.alreadyUpToDate).toBe(false);
      expect(result.versionId).toBe('2026-06-20T12-00-00-000Z');
    }
    expect(adapter.writeFiles).toHaveBeenCalled();
    expect(adapter.pruneOldVersions).toHaveBeenCalled();
  });

  it('requires pro', async () => {
    const adapter = createMockAdapter();
    const result = await pushFileSnapshot({
      records: [],
      folders: [],
      adapter,
      isProActive: () => false,
      withTimeout: async (p) => p,
      isTimeoutError: () => false,
      timeoutErrorMessage: 'timeout',
    });
    expect(result).toEqual({ ok: false, code: 'pro_required' });
  });
});

describe('computeRemoteSyncDiff', () => {
  it('detects removed note paths', () => {
    const diff = computeRemoteSyncDiff({
      currentHashes: {},
      previousHashes: { 'voice-inbox-ai/notes/removed.md': 'hash' },
      notePathPrefix: 'voice-inbox-ai/notes',
    });
    expect(diff.notesRemoved).toBe(1);
    expect(diff.deletionPaths).toContain('voice-inbox-ai/notes/removed.md');
  });
});
