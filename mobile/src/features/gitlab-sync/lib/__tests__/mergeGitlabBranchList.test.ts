import {
  buildGitlabBranchList,
  mergeGitlabBranchList,
  sortGitlabBranchList,
  unionGitlabBranchLists,
  withoutGitlabBranch,
} from '../mergeGitlabBranchList';

describe('sortGitlabBranchList', () => {
  it('puts the default branch first and sorts the rest alphabetically', () => {
    expect(
      sortGitlabBranchList(
        [
          { name: 'voice-inbox-ai-sync' },
          { name: 'master' },
          { name: 'feature-b' },
          { name: 'feature-a' },
        ],
        'master',
      ),
    ).toEqual([
      { name: 'master' },
      { name: 'feature-a' },
      { name: 'feature-b' },
      { name: 'voice-inbox-ai-sync' },
    ]);
  });
});

describe('mergeGitlabBranchList', () => {
  it('returns the list sorted when the branch is already present', () => {
    const branches = [{ name: 'voice-inbox-ai-sync' }, { name: 'main' }];
    expect(mergeGitlabBranchList(branches, 'main', 'main')).toEqual([
      { name: 'main' },
      { name: 'voice-inbox-ai-sync' },
    ]);
  });

  it('appends and sorts the active branch when GitHub list is stale', () => {
    expect(
      mergeGitlabBranchList(
        [{ name: 'master' }, { name: 'voice-inbox-ai-sync' }],
        'voice-inbox-ai-sync-2',
        'master',
      ),
    ).toEqual([
      { name: 'master' },
      { name: 'voice-inbox-ai-sync' },
      { name: 'voice-inbox-ai-sync-2' },
    ]);
  });

  it('ignores blank branch names', () => {
    const branches = [{ name: 'main' }];
    expect(mergeGitlabBranchList(branches, '   ')).toEqual([{ name: 'main' }]);
  });
});

describe('withoutGitlabBranch', () => {
  it('removes a branch by name', () => {
    expect(
      withoutGitlabBranch(
        [{ name: 'main' }, { name: 'voice-inbox-ai-sync-2' }],
        'voice-inbox-ai-sync-2',
      ),
    ).toEqual([{ name: 'main' }]);
  });
});

describe('buildGitlabBranchList', () => {
  it('hides excluded branches while keeping the active branch visible', () => {
    expect(
      buildGitlabBranchList(
        [{ name: 'main' }, { name: 'feature-a' }, { name: 'feature-b' }],
        'main',
        ['feature-a'],
        'main',
      ),
    ).toEqual([{ name: 'main' }, { name: 'feature-b' }]);
  });

  it('still injects the active branch when GitHub list is stale', () => {
    expect(
      buildGitlabBranchList([{ name: 'main' }], 'voice-inbox-ai-sync-2', ['feature-a'], 'main'),
    ).toEqual([{ name: 'main' }, { name: 'voice-inbox-ai-sync-2' }]);
  });
});

describe('unionGitlabBranchLists', () => {
  it('keeps locally known branches missing from the API response', () => {
    expect(
      unionGitlabBranchLists(
        [{ name: 'main' }, { name: 'voice-inbox-ai-sync-4' }],
        [{ name: 'master-3' }],
        'main',
      ),
    ).toEqual([{ name: 'main' }, { name: 'master-3' }, { name: 'voice-inbox-ai-sync-4' }]);
  });
});
