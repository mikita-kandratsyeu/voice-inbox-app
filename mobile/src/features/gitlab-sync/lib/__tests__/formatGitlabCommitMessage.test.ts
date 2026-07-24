import { formatGitlabCommitMessage } from '../formatGitlabCommitMessage';

describe('formatGitlabCommitMessage', () => {
  it('includes sync stats in the commit body', () => {
    const message = formatGitlabCommitMessage({
      diff: {
        added: 2,
        updated: 1,
        removed: 1,
        notesAdded: 2,
        notesUpdated: 1,
        notesRemoved: 1,
        hasChanges: true,
        deletionPaths: [],
      },
      recordCount: 10,
      folderCount: 3,
      graphLayoutCount: 1,
      syncedAt: new Date('2026-06-10T14:30:00.000Z'),
    });

    expect(message.startsWith('sync: 2 new, 1 edited, 1 removed (10 notes)')).toBe(true);
    expect(message).toContain('Voice Inbox AI ·');
    expect(message).toContain('3 folders');
    expect(message).toContain('1 graph layout');
  });

  it('uses refresh backup when only metadata changed', () => {
    const message = formatGitlabCommitMessage({
      diff: {
        added: 0,
        updated: 2,
        removed: 0,
        notesAdded: 0,
        notesUpdated: 0,
        notesRemoved: 0,
        hasChanges: true,
        deletionPaths: [],
      },
      recordCount: 4,
      folderCount: 2,
      graphLayoutCount: 0,
      syncedAt: new Date('2026-06-10T08:00:00.000Z'),
    });

    expect(message.startsWith('sync: refresh backup (4 notes)')).toBe(true);
    expect(message).not.toContain('edited');
  });
});
