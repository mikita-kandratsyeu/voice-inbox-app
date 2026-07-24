import * as Keychain from 'react-native-keychain';

import { isRecord, isString } from '@/shared/lib/type-guards';

import { GITLAB_SYNC_DEFAULT_BASE_PATH, GITLAB_SYNC_DEFAULT_BRANCH } from './constants';

const SERVICE_GITLAB_SYNC = 'voice-inbox-ai-gitlab-sync';
const KEYCHAIN_USERNAME = 'gitlab-sync';

export type GitlabSyncSecrets = {
  accessToken: string;
  owner: string;
  repo: string;
  projectId: number;
  branch: string;
  basePath: string;
};

type StoredPayload = {
  accessToken: string;
  owner: string;
  repo: string;
  projectId: number;
  branch: string;
  basePath: string;
};

const EMPTY: StoredPayload = {
  accessToken: '',
  owner: '',
  repo: '',
  projectId: 0,
  branch: GITLAB_SYNC_DEFAULT_BRANCH,
  basePath: GITLAB_SYNC_DEFAULT_BASE_PATH,
};

function parsePayload(raw: string): StoredPayload {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...EMPTY };
    return {
      accessToken: isString(parsed.accessToken) ? parsed.accessToken : '',
      owner: isString(parsed.owner) ? parsed.owner.trim() : '',
      repo: isString(parsed.repo) ? parsed.repo.trim() : '',
      projectId: typeof parsed.projectId === 'number' ? parsed.projectId : 0,
      branch: isString(parsed.branch) ? parsed.branch.trim() : GITLAB_SYNC_DEFAULT_BRANCH,
      basePath: isString(parsed.basePath) ? parsed.basePath.trim() : GITLAB_SYNC_DEFAULT_BASE_PATH,
    };
  } catch {
    return { ...EMPTY };
  }
}

async function readPayload(): Promise<StoredPayload> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE_GITLAB_SYNC });
    if (!creds) return { ...EMPTY };
    return parsePayload(creds.password);
  } catch {
    return { ...EMPTY };
  }
}

async function writePayload(payload: StoredPayload): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_USERNAME, JSON.stringify(payload), {
    service: SERVICE_GITLAB_SYNC,
  });
}

export async function getGitlabSyncSecrets(): Promise<GitlabSyncSecrets | null> {
  const payload = await readPayload();
  if (!payload.accessToken.trim()) {
    return null;
  }
  return payload;
}

export async function isGitlabSyncConnected(): Promise<boolean> {
  const secrets = await getGitlabSyncSecrets();
  return secrets != null && secrets.projectId > 0;
}

export async function setGitlabSyncAccessToken(accessToken: string): Promise<void> {
  const current = await readPayload();
  await writePayload({ ...current, accessToken: accessToken.trim() });
}

export async function setGitlabSyncBranch(branch: string): Promise<void> {
  const current = await readPayload();
  await writePayload({
    ...current,
    branch: branch.trim() || GITLAB_SYNC_DEFAULT_BRANCH,
  });
}

export async function setGitlabSyncRepository(params: {
  owner: string;
  repo: string;
  projectId: number;
  branch?: string;
  basePath?: string;
}): Promise<void> {
  const current = await readPayload();
  await writePayload({
    ...current,
    owner: params.owner.trim(),
    repo: params.repo.trim(),
    projectId: params.projectId,
    branch: params.branch?.trim() || current.branch || GITLAB_SYNC_DEFAULT_BRANCH,
    basePath: params.basePath?.trim() || current.basePath || GITLAB_SYNC_DEFAULT_BASE_PATH,
  });
}

export async function clearGitlabSyncSecrets(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_GITLAB_SYNC });
}
