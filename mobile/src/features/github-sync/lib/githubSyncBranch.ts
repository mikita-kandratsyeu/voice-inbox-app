const BRANCH_NAME_PATTERN = /^[A-Za-z0-9._/-]+$/;
const MAX_BRANCH_LENGTH = 255;

export function isValidGithubSyncBranchName(branch: string): boolean {
  const trimmed = branch.trim();
  if (!trimmed || trimmed.length > MAX_BRANCH_LENGTH) {
    return false;
  }
  if (trimmed.startsWith('/') || trimmed.endsWith('/') || trimmed.includes('//')) {
    return false;
  }
  return BRANCH_NAME_PATTERN.test(trimmed);
}

export function normalizeGithubSyncBranchName(branch: string): string {
  return branch.trim();
}
