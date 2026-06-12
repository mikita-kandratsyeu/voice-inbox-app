import { matchesSearchQuery } from '@/shared/lib/sheetSearchQuery';

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

function filterReposByQuery(
  repos: GitlabRepoSummary[],
  normalizedQuery: string,
): GitlabRepoSummary[] {
  if (!normalizedQuery) return repos;
  return repos.filter(
    (repo) =>
      matchesSearchQuery(repo.fullName, normalizedQuery) ||
      matchesSearchQuery(repo.name, normalizedQuery) ||
      matchesSearchQuery(repo.owner, normalizedQuery),
  );
}

export function buildGitlabRepoPickerRows({
  repos,
  pinnedFullNames,
  currentFullName,
  normalizedQuery,
}: {
  repos: GitlabRepoSummary[];
  pinnedFullNames: readonly string[];
  currentFullName?: string | null;
  normalizedQuery: string;
}): GitlabRepoPickerRow[] {
  const filtered = filterReposByQuery(repos, normalizedQuery);
  const pinnedSet = new Set(pinnedFullNames);
  const current = currentFullName?.trim() || null;

  if (normalizedQuery) {
    return filtered.map((repo) => ({
      type: 'repo',
      id: String(repo.id),
      repo,
      rowKind:
        repo.fullName === current ? 'current' : pinnedSet.has(repo.fullName) ? 'pinned' : 'default',
    }));
  }

  const repoByFullName = new Map(repos.map((repo) => [repo.fullName, repo]));
  const rows: GitlabRepoPickerRow[] = [];

  const currentRepo = current ? repoByFullName.get(current) : undefined;
  if (currentRepo) {
    rows.push({
      type: 'header',
      id: 'header-current',
      titleKey: 'settings.gitlabSync.currentRepoSection',
    });
    rows.push({
      type: 'repo',
      id: `current-${currentRepo.id}`,
      repo: currentRepo,
      rowKind: 'current',
    });
  }

  const pinnedRepos = pinnedFullNames
    .map((name) => repoByFullName.get(name))
    .filter((repo): repo is GitlabRepoSummary => repo != null && repo.fullName !== current);

  if (pinnedRepos.length > 0) {
    rows.push({
      type: 'header',
      id: 'header-pinned',
      titleKey: 'settings.gitlabSync.pinnedReposSection',
    });
    for (const repo of pinnedRepos) {
      rows.push({
        type: 'repo',
        id: `pinned-${repo.id}`,
        repo,
        rowKind: 'pinned',
      });
    }
  }

  const rest = repos.filter((repo) => repo.fullName !== current && !pinnedSet.has(repo.fullName));
  if (rest.length > 0) {
    if (rows.length > 0) {
      rows.push({
        type: 'header',
        id: 'header-all',
        titleKey: 'settings.gitlabSync.allReposSection',
      });
    }
    for (const repo of rest) {
      rows.push({
        type: 'repo',
        id: `repo-${repo.id}`,
        repo,
        rowKind: 'default',
      });
    }
  }

  return rows;
}

export function gitlabRepoPickerListHeight(rows: GitlabRepoPickerRow[]): number {
  const GITLAB_REPO_PICKER_LIST_MAX_HEIGHT = 420;
  const contentHeight = rows.reduce(
    (height, row) =>
      height +
      (row.type === 'header' ? GITLAB_REPO_PICKER_HEADER_HEIGHT : GITLAB_REPO_PICKER_ROW_HEIGHT),
    0,
  );
  return Math.min(contentHeight, GITLAB_REPO_PICKER_LIST_MAX_HEIGHT);
}
