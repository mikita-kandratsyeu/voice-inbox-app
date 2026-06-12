import { areGitlabSyncHashesEqual, computeGitlabSyncDiff } from '../computeGitlabSyncDiff';

describe('computeGitlabSyncDiff', () => {
  it('detects added, updated, and removed note files', () => {
    const diff = computeGitlabSyncDiff({
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
    expect(diff.notesAdded).toBe(1);
    expect(diff.notesUpdated).toBe(0);
    expect(diff.notesRemoved).toBe(1);
    expect(diff.hasChanges).toBe(true);
    expect(diff.deletionPaths).toEqual(['voice-inbox-ai/notes/c.md']);
  });

  it('reports no changes when hashes match', () => {
    const hashes = {
      'voice-inbox-ai/notes/a.md': '1',
      'voice-inbox-ai/manifest.json': 'm1',
    };
    expect(areGitlabSyncHashesEqual(hashes, { ...hashes })).toBe(true);
    const diff = computeGitlabSyncDiff({
      currentHashes: hashes,
      previousHashes: hashes,
      notePathPrefix: 'voice-inbox-ai/notes',
    });
    expect(diff.hasChanges).toBe(false);
  });

  it('ignores non-note paths when counting additions', () => {
    const diff = computeGitlabSyncDiff({
      currentHashes: {
        'voice-inbox-ai/notes/a.md': '1',
        'voice-inbox-ai/.voice-inbox-ai/HEAD.json': 'head',
      },
      previousHashes: {},
      notePathPrefix: 'voice-inbox-ai/notes',
    });

    expect(diff.added).toBe(1);
    expect(diff.notesAdded).toBe(1);
    expect(diff.hasChanges).toBe(true);
  });
});
