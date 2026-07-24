import { matchesSearchQuery } from '@/shared/lib/sheetSearchQuery';

import type { RemoteRepoSummary } from './types';

export type RepoPickerSectionSuffix =
  | 'currentRepoSection'
  | 'pinnedReposSection'
  | 'allReposSection';

export type RepoPickerRowKind = 'current' | 'pinned' | 'default';

export type RepoPickerRow =
  | { type: 'header'; id: string; sectionSuffix: RepoPickerSectionSuffix }
  | { type: 'repo'; id: string; repo: RemoteRepoSummary; rowKind: RepoPickerRowKind };

export const REPO_PICKER_HEADER_HEIGHT = 36;
export const REPO_PICKER_ROW_HEIGHT = 72;
const REPO_PICKER_LIST_MAX_HEIGHT = 420;

function filterReposByQuery(
  repos: RemoteRepoSummary[],
  normalizedQuery: string,
): RemoteRepoSummary[] {
  if (!normalizedQuery) return repos;
  return repos.filter(
    (repo) =>
      matchesSearchQuery(repo.fullName, normalizedQuery) ||
      matchesSearchQuery(repo.name, normalizedQuery) ||
      matchesSearchQuery(repo.owner, normalizedQuery),
  );
}

export function buildRepoPickerRows({
  repos,
  pinnedFullNames,
  currentFullName,
  normalizedQuery,
}: {
  repos: RemoteRepoSummary[];
  pinnedFullNames: readonly string[];
  currentFullName?: string | null;
  normalizedQuery: string;
}): RepoPickerRow[] {
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
  const rows: RepoPickerRow[] = [];

  const currentRepo = current ? repoByFullName.get(current) : undefined;
  if (currentRepo) {
    rows.push({ type: 'header', id: 'header-current', sectionSuffix: 'currentRepoSection' });
    rows.push({
      type: 'repo',
      id: `current-${currentRepo.id}`,
      repo: currentRepo,
      rowKind: 'current',
    });
  }

  const pinnedRepos = pinnedFullNames
    .map((name) => repoByFullName.get(name))
    .filter((repo): repo is RemoteRepoSummary => repo != null && repo.fullName !== current);

  if (pinnedRepos.length > 0) {
    rows.push({ type: 'header', id: 'header-pinned', sectionSuffix: 'pinnedReposSection' });
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
      rows.push({ type: 'header', id: 'header-all', sectionSuffix: 'allReposSection' });
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

export function repoPickerListHeight(rows: RepoPickerRow[]): number {
  const contentHeight = rows.reduce(
    (height, row) =>
      height + (row.type === 'header' ? REPO_PICKER_HEADER_HEIGHT : REPO_PICKER_ROW_HEIGHT),
    0,
  );
  return Math.min(contentHeight, REPO_PICKER_LIST_MAX_HEIGHT);
}
