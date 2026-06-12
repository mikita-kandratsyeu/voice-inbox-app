import { buildRepoPickerRows } from '../buildRepoPickerRows';
import type { RemoteRepoSummary } from '../types';

const repos: RemoteRepoSummary[] = [
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

describe('buildRepoPickerRows', () => {
  it('groups current, pinned, and remaining repos', () => {
    const rows = buildRepoPickerRows({
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
  });
});
