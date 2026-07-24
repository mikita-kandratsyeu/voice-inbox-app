import { storage } from '@/shared/lib/async-storage/mmkv';
import { isArray, isRecord, isString } from '@/shared/lib/type-guards';

import { pruneRemoteSyncPinnedRepos } from './remoteSyncPinnedReposPolicy';
import type { GitRemoteProvider } from './types';

const KEY_PINNED_REPOS_BY_PROVIDER_LOGIN = 'gitRemoteSync.pinnedReposByProviderLogin';
const LEGACY_GITHUB_KEY = 'githubSync.pinnedReposByLogin';

type PinnedReposByProviderLogin = Record<string, string[]>;

function providerLoginKey(provider: GitRemoteProvider, login: string): string {
  return `${provider}:${login.trim()}`;
}

function parsePinnedRepos(raw: string | undefined): PinnedReposByProviderLogin {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    const out: PinnedReposByProviderLogin = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!isString(key) || !key.trim() || !isArray(value)) continue;
      const names = value
        .filter((item): item is string => isString(item))
        .map((item) => item.trim())
        .filter(Boolean);
      if (names.length > 0) {
        out[key.trim()] = names;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function readPinnedRepos(): PinnedReposByProviderLogin {
  const current = parsePinnedRepos(storage.getString(KEY_PINNED_REPOS_BY_PROVIDER_LOGIN));
  const legacyGithub = parsePinnedRepos(storage.getString(LEGACY_GITHUB_KEY));
  if (Object.keys(legacyGithub).length === 0) {
    return current;
  }

  const merged = { ...current };
  for (const [login, names] of Object.entries(legacyGithub)) {
    const key = providerLoginKey('github', login);
    if (!merged[key]) {
      merged[key] = names;
    }
  }
  storage.set(KEY_PINNED_REPOS_BY_PROVIDER_LOGIN, JSON.stringify(merged));
  storage.remove(LEGACY_GITHUB_KEY);
  return merged;
}

function writePinnedRepos(data: PinnedReposByProviderLogin): void {
  storage.set(KEY_PINNED_REPOS_BY_PROVIDER_LOGIN, JSON.stringify(data));
}

export function getRemoteSyncPinnedRepos(provider: GitRemoteProvider, login: string): string[] {
  const key = providerLoginKey(provider, login);
  if (!key.endsWith(':') && key.includes(':')) {
    return [...(readPinnedRepos()[key] ?? [])];
  }
  return [];
}

export function setRemoteSyncPinnedRepos(
  provider: GitRemoteProvider,
  login: string,
  fullNames: readonly string[],
): void {
  const key = providerLoginKey(provider, login);
  if (!login.trim()) return;

  const unique: string[] = [];
  for (const name of fullNames) {
    const trimmed = name.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
  }

  const all = readPinnedRepos();
  if (unique.length === 0) {
    delete all[key];
  } else {
    all[key] = unique;
  }
  writePinnedRepos(all);
}

export function syncRemoteSyncPinnedRepos(
  provider: GitRemoteProvider,
  login: string,
  availableFullNames: readonly string[],
): string[] {
  if (!login.trim()) return [];

  const current = getRemoteSyncPinnedRepos(provider, login);
  const pruned = pruneRemoteSyncPinnedRepos(current, availableFullNames);
  if (pruned.length !== current.length) {
    setRemoteSyncPinnedRepos(provider, login, pruned);
  }
  return pruned;
}
