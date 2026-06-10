import { storage } from '@/shared/lib/async-storage/mmkv';

const KEY_LAST_COMMIT_SHA = 'githubSync.lastCommitSha';
const KEY_LAST_SYNCED_AT = 'githubSync.lastSyncedAt';
const KEY_LAST_ERROR = 'githubSync.lastError';
const KEY_CONTENT_HASHES = 'githubSync.contentHashes';

export function getGithubSyncLastCommitSha(): string | null {
  const value = storage.getString(KEY_LAST_COMMIT_SHA);
  return value?.trim() || null;
}

export function setGithubSyncLastCommitSha(sha: string): void {
  storage.set(KEY_LAST_COMMIT_SHA, sha.trim());
}

export function getGithubSyncLastSyncedAt(): string | null {
  const value = storage.getString(KEY_LAST_SYNCED_AT);
  return value?.trim() || null;
}

export function setGithubSyncLastSyncedAt(iso: string): void {
  storage.set(KEY_LAST_SYNCED_AT, iso);
}

export function getGithubSyncLastError(): string | null {
  const value = storage.getString(KEY_LAST_ERROR);
  return value?.trim() || null;
}

export function setGithubSyncLastError(message: string | null): void {
  if (!message?.trim()) {
    storage.remove(KEY_LAST_ERROR);
    return;
  }
  storage.set(KEY_LAST_ERROR, message.trim());
}

export function getGithubSyncContentHashes(): Record<string, string> {
  const raw = storage.getString(KEY_CONTENT_HASHES);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed == null) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function setGithubSyncContentHashes(hashes: Record<string, string>): void {
  storage.set(KEY_CONTENT_HASHES, JSON.stringify(hashes));
}

export function clearGithubSyncState(): void {
  storage.remove(KEY_LAST_COMMIT_SHA);
  storage.remove(KEY_LAST_SYNCED_AT);
  storage.remove(KEY_LAST_ERROR);
  storage.remove(KEY_CONTENT_HASHES);
}
