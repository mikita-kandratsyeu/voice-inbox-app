import type { GithubBranchSummary } from './githubApi';

function compareBranchNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/** Puts the repository default branch first; remaining branches stay alphabetically sorted. */
export function sortGithubBranchList(
  branches: GithubBranchSummary[],
  defaultBranch?: string | null,
): GithubBranchSummary[] {
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
export function mergeGithubBranchList(
  branches: GithubBranchSummary[],
  includeBranch?: string | null,
  defaultBranch?: string | null,
): GithubBranchSummary[] {
  const trimmed = includeBranch?.trim();
  const list =
    trimmed && !branches.some((item) => item.name === trimmed)
      ? [...branches, { name: trimmed }]
      : branches;
  return sortGithubBranchList(list, defaultBranch);
}

export function withoutGithubBranch(
  branches: GithubBranchSummary[],
  branchName: string,
): GithubBranchSummary[] {
  const trimmed = branchName.trim();
  if (!trimmed) {
    return branches;
  }
  const next = branches.filter((item) => item.name !== trimmed);
  return next.length === branches.length ? branches : next;
}

export function buildGithubBranchList(
  branches: GithubBranchSummary[],
  activeBranch: string,
  excludedNames: Iterable<string> = [],
  defaultBranch?: string | null,
): GithubBranchSummary[] {
  let list = branches;
  for (const name of excludedNames) {
    list = withoutGithubBranch(list, name);
  }
  return mergeGithubBranchList(list, activeBranch, defaultBranch);
}

export function unionGithubBranchLists(
  primary: GithubBranchSummary[],
  supplemental: GithubBranchSummary[],
  defaultBranch?: string | null,
): GithubBranchSummary[] {
  const byName = new Map<string, GithubBranchSummary>();
  for (const branch of primary) {
    byName.set(branch.name, branch);
  }
  for (const branch of supplemental) {
    if (!byName.has(branch.name)) {
      byName.set(branch.name, branch);
    }
  }
  return sortGithubBranchList([...byName.values()], defaultBranch);
}
