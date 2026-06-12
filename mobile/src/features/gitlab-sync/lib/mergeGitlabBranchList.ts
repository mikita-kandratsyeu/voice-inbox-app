import type { GitlabBranchSummary } from './gitlabApi';

function compareBranchNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Puts the repository default branch first; remaining branches stay alphabetically sorted. */
export function sortGitlabBranchList(
  branches: GitlabBranchSummary[],
  defaultBranch?: string | null,
): GitlabBranchSummary[] {
  const trimmedDefault = defaultBranch?.trim();
  if (!trimmedDefault) {
    return [...branches].sort((a, b) => compareBranchNames(a.name, b.name));
  }

  const defaultItem = branches.find((item) => item.name === trimmedDefault);
  const rest = branches
    .filter((item) => item.name !== trimmedDefault)
    .sort((a, b) => compareBranchNames(a.name, b.name));

  return defaultItem ? [defaultItem, ...rest] : rest;
}

/** Ensures the active sync branch is visible even if GitHub list is briefly stale. */
export function mergeGitlabBranchList(
  branches: GitlabBranchSummary[],
  includeBranch?: string | null,
  defaultBranch?: string | null,
): GitlabBranchSummary[] {
  const trimmed = includeBranch?.trim();
  const list =
    trimmed && !branches.some((item) => item.name === trimmed)
      ? [...branches, { name: trimmed }]
      : branches;
  return sortGitlabBranchList(list, defaultBranch);
}

export function withoutGitlabBranch(
  branches: GitlabBranchSummary[],
  branchName: string,
): GitlabBranchSummary[] {
  const trimmed = branchName.trim();
  if (!trimmed) {
    return branches;
  }
  const next = branches.filter((item) => item.name !== trimmed);
  return next.length === branches.length ? branches : next;
}

export function buildGitlabBranchList(
  branches: GitlabBranchSummary[],
  activeBranch: string,
  excludedNames: Iterable<string> = [],
  defaultBranch?: string | null,
): GitlabBranchSummary[] {
  let list = branches;
  for (const name of excludedNames) {
    list = withoutGitlabBranch(list, name);
  }
  return mergeGitlabBranchList(list, activeBranch, defaultBranch);
}

export function unionGitlabBranchLists(
  primary: GitlabBranchSummary[],
  supplemental: GitlabBranchSummary[],
  defaultBranch?: string | null,
): GitlabBranchSummary[] {
  const byName = new Map<string, GitlabBranchSummary>();
  for (const branch of primary) {
    byName.set(branch.name, branch);
  }
  for (const branch of supplemental) {
    if (!byName.has(branch.name)) {
      byName.set(branch.name, branch);
    }
  }
  return sortGitlabBranchList([...byName.values()], defaultBranch);
}
