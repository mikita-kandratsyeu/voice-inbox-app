import { type GitlabCommitSummary, listGitlabCommits } from './gitlabApi';
import type { GitlabSyncSecrets } from './gitlabSecrets';

export async function fetchGitlabSyncHistory(
  secrets: GitlabSyncSecrets,
): Promise<GitlabCommitSummary[]> {
  return listGitlabCommits(secrets.accessToken, secrets.projectId, secrets.branch);
}
