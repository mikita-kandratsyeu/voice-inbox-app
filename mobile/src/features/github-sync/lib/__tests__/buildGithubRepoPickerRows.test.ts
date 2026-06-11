import { buildGithubRepoPickerRows } from '../buildGithubRepoPickerRows';
import type { GithubRepoSummary } from '../githubApi';

const repos: GithubRepoSummary[] = [
  {
    id: 1,
    fullName: 'user/current',
    owner: 'user',
    name: 'current',
    private: true,
    defaultBranch: 'main',
  },
  {
    id: 2,
    fullName: 'user/pinned',
    owner: 'user',
    name: 'pinned',
    private: false,
    defaultBranch: 'main',
  },
  {
    id: 3,
    fullName: 'user/other',
    owner: 'user',
    name: 'other',
    private: false,
    defaultBranch: 'main',
  },
];

describe('buildGithubRepoPickerRows', () => {
  it('groups current, pinned, and remaining repos', () => {
    const rows = buildGithubRepoPickerRows({
      repos,
      pinnedFullNames: ['user/pinned'],
      currentFullName: 'user/current',
      normalizedQuery: '',
    });

    expect(rows.map((row) => row.type)).toEqual([
      'header',
      'repo',
      'header',
      'repo',
      'header',
      'repo',
    ]);
    expect(rows.filter((row) => row.type === 'repo').map((row) => row.repo.fullName)).toEqual([
      'user/current',
      'user/pinned',
      'user/other',
    ]);
  });

  it('returns a flat filtered list while searching', () => {
    const rows = buildGithubRepoPickerRows({
      repos,
      pinnedFullNames: ['user/pinned'],
      currentFullName: 'user/current',
      normalizedQuery: 'pinned',
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'repo',
      repo: { fullName: 'user/pinned' },
      rowKind: 'pinned',
    });
  });
});
