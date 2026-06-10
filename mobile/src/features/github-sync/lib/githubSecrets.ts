import * as Keychain from 'react-native-keychain';

import { isRecord, isString } from '@/shared/lib/type-guards';

import { GITHUB_SYNC_DEFAULT_BASE_PATH, GITHUB_SYNC_DEFAULT_BRANCH } from './constants';

const SERVICE_GITHUB_SYNC = 'voice-inbox-ai-github-sync';
const KEYCHAIN_USERNAME = 'github-sync';

export type GithubSyncSecrets = {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
};

type StoredPayload = {
  accessToken: string;
  owner: string;
  repo: string;
  branch: string;
  basePath: string;
};

const EMPTY: StoredPayload = {
  accessToken: '',
  owner: '',
  repo: '',
  branch: GITHUB_SYNC_DEFAULT_BRANCH,
  basePath: GITHUB_SYNC_DEFAULT_BASE_PATH,
};

function parsePayload(raw: string): StoredPayload {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...EMPTY };
    return {
      accessToken: isString(parsed.accessToken) ? parsed.accessToken : '',
      owner: isString(parsed.owner) ? parsed.owner.trim() : '',
      repo: isString(parsed.repo) ? parsed.repo.trim() : '',
      branch: isString(parsed.branch) ? parsed.branch.trim() : GITHUB_SYNC_DEFAULT_BRANCH,
      basePath: isString(parsed.basePath) ? parsed.basePath.trim() : GITHUB_SYNC_DEFAULT_BASE_PATH,
    };
  } catch {
    return { ...EMPTY };
  }
}

async function readPayload(): Promise<StoredPayload> {
  try {
    const creds = await Keychain.getGenericPassword({ service: SERVICE_GITHUB_SYNC });
    if (!creds) return { ...EMPTY };
    return parsePayload(creds.password);
  } catch {
    return { ...EMPTY };
  }
}

async function writePayload(payload: StoredPayload): Promise<void> {
  await Keychain.setGenericPassword(KEYCHAIN_USERNAME, JSON.stringify(payload), {
    service: SERVICE_GITHUB_SYNC,
  });
}

export async function getGithubSyncSecrets(): Promise<GithubSyncSecrets | null> {
  const payload = await readPayload();
  if (!payload.accessToken.trim()) {
    return null;
  }
  return payload;
}

export async function isGithubSyncConnected(): Promise<boolean> {
  const secrets = await getGithubSyncSecrets();
  return secrets != null && secrets.owner.length > 0 && secrets.repo.length > 0;
}

export async function setGithubSyncAccessToken(accessToken: string): Promise<void> {
  const current = await readPayload();
  await writePayload({ ...current, accessToken: accessToken.trim() });
}

export async function setGithubSyncRepository(params: {
  owner: string;
  repo: string;
  branch?: string;
  basePath?: string;
}): Promise<void> {
  const current = await readPayload();
  await writePayload({
    ...current,
    owner: params.owner.trim(),
    repo: params.repo.trim(),
    branch: params.branch?.trim() || current.branch || GITHUB_SYNC_DEFAULT_BRANCH,
    basePath: params.basePath?.trim() || current.basePath || GITHUB_SYNC_DEFAULT_BASE_PATH,
  });
}

export async function clearGithubSyncSecrets(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_GITHUB_SYNC });
}
