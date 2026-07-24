import { GITHUB_SYNC_LEGACY_MANIFEST_FILE } from './constants';
import { type GithubCommitSummary, listGithubCommits } from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';

export async function fetchGithubSyncHistory(
  secrets: GithubSyncSecrets,
  page = 1,
): Promise<GithubCommitSummary[]> {
  // Commits store tree paths relative to basePath (see createGithubCommitWithFiles).
  return listGithubCommits(
    secrets.accessToken,
    secrets.owner,
    secrets.repo,
    secrets.branch,
    GITHUB_SYNC_LEGACY_MANIFEST_FILE,
    page,
  );
}
