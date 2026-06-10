import { type GithubCommitSummary, listGithubCommits } from './githubApi';
import type { GithubSyncSecrets } from './githubSecrets';

export async function fetchGithubSyncHistory(
  secrets: GithubSyncSecrets,
  page = 1,
): Promise<GithubCommitSummary[]> {
  const basePath = secrets.basePath.replace(/^\/+|\/+$/g, '');
  return listGithubCommits(
    secrets.accessToken,
    secrets.owner,
    secrets.repo,
    secrets.branch,
    basePath,
    page,
  );
}
