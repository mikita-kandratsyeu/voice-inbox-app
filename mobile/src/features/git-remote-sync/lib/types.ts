export type GitRemoteProvider = 'github' | 'gitlab';

export type RemoteRepoSummary = {
  id: number;
  fullName: string;
  owner: string;
  name: string;
  private: boolean;
  defaultBranch: string;
};

export type RemoteCommitSummary = {
  sha: string;
  message: string;
  htmlUrl: string;
  committedAt: string;
};

export type RemoteBranchSummary = {
  name: string;
};

export type RemoteSyncSecrets = {
  accessToken: string;
  owner: string;
  repo: string;
  projectId?: number;
  branch: string;
  basePath: string;
};
