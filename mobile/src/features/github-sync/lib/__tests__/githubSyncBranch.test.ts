import { isValidGithubSyncBranchName } from '../githubSyncBranch';

describe('githubSyncBranch', () => {
  it('accepts common branch names', () => {
    expect(isValidGithubSyncBranchName('voice-inbox-ai-sync')).toBe(true);
    expect(isValidGithubSyncBranchName('backup/feature-1')).toBe(true);
  });

  it('rejects empty or invalid characters', () => {
    expect(isValidGithubSyncBranchName('')).toBe(false);
    expect(isValidGithubSyncBranchName('bad branch')).toBe(false);
    expect(isValidGithubSyncBranchName('/leading')).toBe(false);
  });
});
