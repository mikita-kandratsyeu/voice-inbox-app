import { formatGitlabCommitMessage } from '../formatGitlabCommitMessage';

describe('formatGitlabCommitMessage', () => {
  it('includes sync stats in the commit body', () => {
    const message = formatGitlabCommitMessage({
      diff: { added: 2, updated: 1, removed: 1, hasChanges: true, deletionPaths: [] },
      recordCount: 10,
      folderCount: 3,
      graphLayoutCount: 1,
      syncedAt: new Date('2026-06-10T14:30:00.000Z'),
    });

    expect(message).toContain('Voice Inbox AI sync');
    expect(message).toContain('Notes: 10 (+2 new, ~1 edited, -1 removed)');
    expect(message).toContain('Folders: 3');
    expect(message).toContain('Graph layouts: 1');
  });

  it('omits edit summary when nothing changed', () => {
    const message = formatGitlabCommitMessage({
      diff: { added: 0, updated: 0, removed: 0, hasChanges: false, deletionPaths: [] },
      recordCount: 4,
      folderCount: 2,
      graphLayoutCount: 0,
      syncedAt: new Date('2026-06-10T08:00:00.000Z'),
    });

    expect(message).toContain('Notes: 4');
    expect(message).not.toContain('(+');
    expect(message).not.toContain('edited');
  });
});
