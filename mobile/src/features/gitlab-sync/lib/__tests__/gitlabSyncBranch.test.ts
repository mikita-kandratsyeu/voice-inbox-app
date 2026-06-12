import { isValidGitlabSyncBranchName } from '../gitlabSyncBranch';

describe('gitlabSyncBranch', () => {
  it('accepts common branch names', () => {
    expect(isValidGitlabSyncBranchName('voice-inbox-ai-sync')).toBe(true);
    expect(isValidGitlabSyncBranchName('backup/feature-1')).toBe(true);
  });

  it('rejects empty or invalid characters', () => {
    expect(isValidGitlabSyncBranchName('')).toBe(false);
    expect(isValidGitlabSyncBranchName('bad branch')).toBe(false);
    expect(isValidGitlabSyncBranchName('/leading')).toBe(false);
  });
});
