import {
  buildGithubBranchList,
  mergeGithubBranchList,
  sortGithubBranchList,
  unionGithubBranchLists,
  withoutGithubBranch,
} from '../mergeGithubBranchList';

describe('sortGithubBranchList', () => {
  it('puts the default branch first and sorts the rest alphabetically', () => {
    expect(
      sortGithubBranchList(
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

describe('mergeGithubBranchList', () => {
  it('returns the list sorted when the branch is already present', () => {
    const branches = [{ name: 'voice-inbox-ai-sync' }, { name: 'main' }];
    expect(mergeGithubBranchList(branches, 'main', 'main')).toEqual([
      { name: 'main' },
      { name: 'voice-inbox-ai-sync' },
    ]);
  });

  it('appends and sorts the active branch when GitHub list is stale', () => {
    expect(
      mergeGithubBranchList(
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
    expect(mergeGithubBranchList(branches, '   ')).toEqual([{ name: 'main' }]);
  });
});

describe('withoutGithubBranch', () => {
  it('removes a branch by name', () => {
    expect(
      withoutGithubBranch(
        [{ name: 'main' }, { name: 'voice-inbox-ai-sync-2' }],
        'voice-inbox-ai-sync-2',
      ),
    ).toEqual([{ name: 'main' }]);
  });
});

describe('buildGithubBranchList', () => {
  it('hides excluded branches while keeping the active branch visible', () => {
    expect(
      buildGithubBranchList(
        [{ name: 'main' }, { name: 'feature-a' }, { name: 'feature-b' }],
        'main',
        ['feature-a'],
        'main',
      ),
    ).toEqual([{ name: 'main' }, { name: 'feature-b' }]);
  });

  it('still injects the active branch when GitHub list is stale', () => {
    expect(
      buildGithubBranchList([{ name: 'main' }], 'voice-inbox-ai-sync-2', ['feature-a'], 'main'),
    ).toEqual([{ name: 'main' }, { name: 'voice-inbox-ai-sync-2' }]);
  });
});

describe('unionGithubBranchLists', () => {
  it('keeps locally known branches missing from the API response', () => {
    expect(
      unionGithubBranchLists(
        [{ name: 'main' }, { name: 'voice-inbox-ai-sync-4' }],
        [{ name: 'master-3' }],
        'main',
      ),
    ).toEqual([{ name: 'main' }, { name: 'master-3' }, { name: 'voice-inbox-ai-sync-4' }]);
  });
});
