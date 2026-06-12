import {
  buildRepoPickerRows,
  repoPickerListHeight,
} from '@/features/git-remote-sync/lib/buildRepoPickerRows';

import type { GitlabRepoSummary } from './gitlabApi';

export type GitlabRepoPickerSectionTitleKey =
  | 'settings.gitlabSync.currentRepoSection'
  | 'settings.gitlabSync.pinnedReposSection'
  | 'settings.gitlabSync.allReposSection';

export type GitlabRepoPickerRowKind = 'current' | 'pinned' | 'default';

export type GitlabRepoPickerRow =
  | { type: 'header'; id: string; titleKey: GitlabRepoPickerSectionTitleKey }
  | { type: 'repo'; id: string; repo: GitlabRepoSummary; rowKind: GitlabRepoPickerRowKind };

export const GITLAB_REPO_PICKER_HEADER_HEIGHT = 36;
export const GITLAB_REPO_PICKER_ROW_HEIGHT = 72;

const SECTION_SUFFIX_BY_KEY: Record<GitlabRepoPickerSectionTitleKey, string> = {
  'settings.gitlabSync.currentRepoSection': 'currentRepoSection',
  'settings.gitlabSync.pinnedReposSection': 'pinnedReposSection',
  'settings.gitlabSync.allReposSection': 'allReposSection',
};

const KEY_BY_SECTION_SUFFIX: Record<string, GitlabRepoPickerSectionTitleKey> = {
  currentRepoSection: 'settings.gitlabSync.currentRepoSection',
  pinnedReposSection: 'settings.gitlabSync.pinnedReposSection',
  allReposSection: 'settings.gitlabSync.allReposSection',
};

export function buildGitlabRepoPickerRows(params: {
  repos: GitlabRepoSummary[];
  pinnedFullNames: readonly string[];
  currentFullName?: string | null;
  normalizedQuery: string;
}): GitlabRepoPickerRow[] {
  const rows = buildRepoPickerRows(params);
  return rows.map((row) => {
    if (row.type === 'header') {
      return {
        type: 'header' as const,
        id: row.id,
        titleKey: KEY_BY_SECTION_SUFFIX[row.sectionSuffix] ?? 'settings.gitlabSync.allReposSection',
      };
    }
    return row;
  });
}

export function gitlabRepoPickerListHeight(rows: GitlabRepoPickerRow[]): number {
  const genericRows = rows.map((row) => {
    if (row.type === 'header') {
      return {
        type: 'header' as const,
        id: row.id,
        sectionSuffix: SECTION_SUFFIX_BY_KEY[row.titleKey].replace('settings.gitlabSync.', '') as
          | 'currentRepoSection'
          | 'pinnedReposSection'
          | 'allReposSection',
      };
    }
    return row;
  });
  return repoPickerListHeight(genericRows);
}
