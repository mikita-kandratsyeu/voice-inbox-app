import { storage } from '@/shared/lib/async-storage/mmkv';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import { pruneGithubSyncPinnedRepos } from './githubSyncPinnedReposPolicy';

const KEY_PINNED_REPOS_BY_LOGIN = 'githubSync.pinnedReposByLogin';

type PinnedReposByLogin = Record<string, string[]>;

function parsePinnedReposByLogin(raw: string | undefined): PinnedReposByLogin {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const out: PinnedReposByLogin = {};
    for (const [login, value] of Object.entries(parsed)) {
      if (!isString(login) || !login.trim() || !isArray(value)) continue;
      const names = value
        .filter((item): item is string => isString(item))
        .map((item) => item.trim())
        .filter(Boolean);
      if (names.length > 0) {
        out[login.trim()] = names;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function readPinnedReposByLogin(): PinnedReposByLogin {
  return parsePinnedReposByLogin(storage.getString(KEY_PINNED_REPOS_BY_LOGIN));
}

function writePinnedReposByLogin(data: PinnedReposByLogin): void {
  storage.set(KEY_PINNED_REPOS_BY_LOGIN, JSON.stringify(data));
}

export function getGithubSyncPinnedRepos(login: string): string[] {
  const trimmedLogin = login.trim();
  if (!trimmedLogin) return [];
  return [...(readPinnedReposByLogin()[trimmedLogin] ?? [])];
}

export function setGithubSyncPinnedRepos(login: string, fullNames: readonly string[]): void {
  const trimmedLogin = login.trim();
  if (!trimmedLogin) return;

  const unique: string[] = [];
  for (const name of fullNames) {
    const trimmed = name.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
  }

  const all = readPinnedReposByLogin();
  if (unique.length === 0) {
    delete all[trimmedLogin];
  } else {
    all[trimmedLogin] = unique;
  }
  writePinnedReposByLogin(all);
}

export function syncGithubSyncPinnedRepos(
  login: string,
  availableFullNames: readonly string[],
): string[] {
  const trimmedLogin = login.trim();
  if (!trimmedLogin) return [];

  const current = getGithubSyncPinnedRepos(trimmedLogin);
  const pruned = pruneGithubSyncPinnedRepos(current, availableFullNames);
  if (pruned.length !== current.length) {
    setGithubSyncPinnedRepos(trimmedLogin, pruned);
  }
  return pruned;
}
