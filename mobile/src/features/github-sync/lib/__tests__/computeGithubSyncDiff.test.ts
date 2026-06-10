import { areGithubSyncHashesEqual, computeGithubSyncDiff } from '../computeGithubSyncDiff';

describe('computeGithubSyncDiff', () => {
  it('detects added, updated, and removed note files', () => {
    const diff = computeGithubSyncDiff({
      currentHashes: {
        'voice-inbox-ai/notes/a.md': '1',
        'voice-inbox-ai/notes/b.md': '2',
        'voice-inbox-ai/manifest.json': 'm2',
      },
      previousHashes: {
        'voice-inbox-ai/notes/a.md': '1',
        'voice-inbox-ai/notes/c.md': '3',
        'voice-inbox-ai/manifest.json': 'm1',
      },
      notePathPrefix: 'voice-inbox-ai/notes',
    });

    expect(diff.added).toBe(1);
    expect(diff.updated).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.hasChanges).toBe(true);
    expect(diff.deletionPaths).toEqual(['voice-inbox-ai/notes/c.md']);
  });

  it('reports no changes when hashes match', () => {
    const hashes = {
      'voice-inbox-ai/notes/a.md': '1',
      'voice-inbox-ai/manifest.json': 'm1',
    };
    expect(areGithubSyncHashesEqual(hashes, { ...hashes })).toBe(true);
    const diff = computeGithubSyncDiff({
      currentHashes: hashes,
      previousHashes: hashes,
      notePathPrefix: 'voice-inbox-ai/notes',
    });
    expect(diff.hasChanges).toBe(false);
  });
});
