import type { GithubBranchSummary } from './githubApi';

/** Ensures the active sync branch is visible even if GitHub list is briefly stale. */
export function mergeGithubBranchList(
  branches: GithubBranchSummary[],
  includeBranch?: string | null,
): GithubBranchSummary[] {
  const trimmed = includeBranch?.trim();
  if (!trimmed || branches.some((item) => item.name === trimmed)) {
    return branches;
  }
  return [...branches, { name: trimmed }].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
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
): GithubBranchSummary[] {
  let list = branches;
  for (const name of excludedNames) {
    list = withoutGithubBranch(list, name);
  }
  return mergeGithubBranchList(list, activeBranch);
}

export function unionGithubBranchLists(
  primary: GithubBranchSummary[],
  supplemental: GithubBranchSummary[],
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
  return [...byName.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}
