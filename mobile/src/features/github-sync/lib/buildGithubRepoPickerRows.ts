import { matchesSearchQuery } from '@/shared/lib/sheetSearchQuery';

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

function filterReposByQuery(
  repos: GithubRepoSummary[],
  normalizedQuery: string,
): GithubRepoSummary[] {
  if (!normalizedQuery) return repos;
  return repos.filter(
    (repo) =>
      matchesSearchQuery(repo.fullName, normalizedQuery) ||
      matchesSearchQuery(repo.name, normalizedQuery) ||
      matchesSearchQuery(repo.owner, normalizedQuery),
  );
}

export function buildGithubRepoPickerRows({
  repos,
  pinnedFullNames,
  currentFullName,
  normalizedQuery,
}: {
  repos: GithubRepoSummary[];
  pinnedFullNames: readonly string[];
  currentFullName?: string | null;
  normalizedQuery: string;
}): GithubRepoPickerRow[] {
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
  const rows: GithubRepoPickerRow[] = [];

  const currentRepo = current ? repoByFullName.get(current) : undefined;
  if (currentRepo) {
    rows.push({
      type: 'header',
      id: 'header-current',
      titleKey: 'settings.githubSync.currentRepoSection',
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
    .filter((repo): repo is GithubRepoSummary => repo != null && repo.fullName !== current);

  if (pinnedRepos.length > 0) {
    rows.push({
      type: 'header',
      id: 'header-pinned',
      titleKey: 'settings.githubSync.pinnedReposSection',
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
        titleKey: 'settings.githubSync.allReposSection',
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

export function githubRepoPickerListHeight(rows: GithubRepoPickerRow[]): number {
  const GITHUB_REPO_PICKER_LIST_MAX_HEIGHT = 420;
  const contentHeight = rows.reduce(
    (height, row) =>
      height +
      (row.type === 'header' ? GITHUB_REPO_PICKER_HEADER_HEIGHT : GITHUB_REPO_PICKER_ROW_HEIGHT),
    0,
  );
  return Math.min(contentHeight, GITHUB_REPO_PICKER_LIST_MAX_HEIGHT);
}
