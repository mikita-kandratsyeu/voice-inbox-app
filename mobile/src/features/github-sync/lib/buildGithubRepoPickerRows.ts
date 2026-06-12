import {
  buildRepoPickerRows,
  repoPickerListHeight,
} from '@/features/git-remote-sync/lib/buildRepoPickerRows';

import type { GithubRepoSummary } from './githubApi';

export type GithubRepoPickerSectionTitleKey =
  | 'settings.githubSync.currentRepoSection'
  | 'settings.githubSync.pinnedReposSection'
  | 'settings.githubSync.allReposSection';

export type GithubRepoPickerRowKind = 'current' | 'pinned' | 'default';

export type GithubRepoPickerRow =
  | { type: 'header'; id: string; titleKey: GithubRepoPickerSectionTitleKey }
  | { type: 'repo'; id: string; repo: GithubRepoSummary; rowKind: GithubRepoPickerRowKind };

export const GITHUB_REPO_PICKER_HEADER_HEIGHT = 36;
export const GITHUB_REPO_PICKER_ROW_HEIGHT = 72;

const SECTION_SUFFIX_BY_KEY: Record<GithubRepoPickerSectionTitleKey, string> = {
  'settings.githubSync.currentRepoSection': 'currentRepoSection',
  'settings.githubSync.pinnedReposSection': 'pinnedReposSection',
  'settings.githubSync.allReposSection': 'allReposSection',
};

const KEY_BY_SECTION_SUFFIX: Record<string, GithubRepoPickerSectionTitleKey> = {
  currentRepoSection: 'settings.githubSync.currentRepoSection',
  pinnedReposSection: 'settings.githubSync.pinnedReposSection',
  allReposSection: 'settings.githubSync.allReposSection',
};

export function buildGithubRepoPickerRows(params: {
  repos: GithubRepoSummary[];
  pinnedFullNames: readonly string[];
  currentFullName?: string | null;
  normalizedQuery: string;
}): GithubRepoPickerRow[] {
  const rows = buildRepoPickerRows(params);
  return rows.map((row) => {
    if (row.type === 'header') {
      return {
        type: 'header' as const,
        id: row.id,
        titleKey: KEY_BY_SECTION_SUFFIX[row.sectionSuffix] ?? 'settings.githubSync.allReposSection',
      };
    }
    return row;
  });
}

export function githubRepoPickerListHeight(rows: GithubRepoPickerRow[]): number {
  const genericRows = rows.map((row) => {
    if (row.type === 'header') {
      return {
        type: 'header' as const,
        id: row.id,
        sectionSuffix: SECTION_SUFFIX_BY_KEY[row.titleKey].replace('settings.githubSync.', '') as
          | 'currentRepoSection'
          | 'pinnedReposSection'
          | 'allReposSection',
      };
    }
    return row;
  });
  return repoPickerListHeight(genericRows);
}
