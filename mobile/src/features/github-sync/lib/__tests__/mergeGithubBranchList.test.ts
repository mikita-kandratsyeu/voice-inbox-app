import {
  buildGithubBranchList,
  mergeGithubBranchList,
  unionGithubBranchLists,
  withoutGithubBranch,
} from '../mergeGithubBranchList';

describe('mergeGithubBranchList', () => {
  it('returns the list unchanged when the branch is already present', () => {
    const branches = [{ name: 'main' }, { name: 'voice-inbox-ai-sync' }];
    expect(mergeGithubBranchList(branches, 'main')).toBe(branches);
  });

  it('appends and sorts the active branch when GitHub list is stale', () => {
    expect(
      mergeGithubBranchList([{ name: 'master' }, { name: 'voice-inbox-ai-sync' }], 'voice-inbox-ai-sync-2'),
    ).toEqual([
      { name: 'master' },
      { name: 'voice-inbox-ai-sync' },
      { name: 'voice-inbox-ai-sync-2' },
    ]);
  });

  it('ignores blank branch names', () => {
    const branches = [{ name: 'main' }];
    expect(mergeGithubBranchList(branches, '   ')).toBe(branches);
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
      ),
    ).toEqual([{ name: 'main' }, { name: 'feature-b' }]);
  });

  it('still injects the active branch when GitHub list is stale', () => {
    expect(
      buildGithubBranchList(
        [{ name: 'main' }],
        'voice-inbox-ai-sync-2',
        ['feature-a'],
      ),
    ).toEqual([{ name: 'main' }, { name: 'voice-inbox-ai-sync-2' }]);
  });
});

describe('unionGithubBranchLists', () => {
  it('keeps locally known branches missing from the API response', () => {
    expect(
      unionGithubBranchLists(
        [{ name: 'main' }, { name: 'voice-inbox-ai-sync-4' }],
        [{ name: 'master-3' }],
      ),
    ).toEqual([
      { name: 'main' },
      { name: 'master-3' },
      { name: 'voice-inbox-ai-sync-4' },
    ]);
  });
});
