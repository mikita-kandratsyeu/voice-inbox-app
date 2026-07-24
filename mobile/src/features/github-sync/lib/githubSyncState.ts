import { storage } from '@/shared/lib/async-storage/mmkv';

const KEY_LAST_COMMIT_SHA = 'githubSync.lastCommitSha';
const KEY_LAST_SYNCED_AT = 'githubSync.lastSyncedAt';
const KEY_LAST_ERROR = 'githubSync.lastError';
const KEY_CONTENT_HASHES = 'githubSync.contentHashes';
const KEY_GITHUB_LOGIN = 'githubSync.githubLogin';
const KEY_AUTO_ENABLED = 'githubSync.autoEnabled';
const KEY_AUTO_INTERVAL_HOURS = 'githubSync.autoIntervalHours';
const KEY_LAST_AUTO_ATTEMPT_AT = 'githubSync.lastAutoAttemptAt';

export const GITHUB_SYNC_AUTO_INTERVAL_OPTIONS = [12, 24, 72, 168] as const;
export type GithubSyncAutoIntervalHours = (typeof GITHUB_SYNC_AUTO_INTERVAL_OPTIONS)[number];
const DEFAULT_AUTO_INTERVAL_HOURS: GithubSyncAutoIntervalHours = 24;

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

export function getGithubSyncLogin(): string | null {
  const value = storage.getString(KEY_GITHUB_LOGIN);
  return value?.trim() || null;
}

export function setGithubSyncLogin(login: string | null): void {
  const trimmed = login?.trim();
  if (!trimmed) {
    storage.remove(KEY_GITHUB_LOGIN);
    return;
  }
  storage.set(KEY_GITHUB_LOGIN, trimmed);
}

export function getGithubSyncAutoEnabled(): boolean {
  return storage.getBoolean(KEY_AUTO_ENABLED) === true;
}

export function setGithubSyncAutoEnabled(enabled: boolean): void {
  storage.set(KEY_AUTO_ENABLED, enabled);
}

export function getGithubSyncAutoIntervalHours(): GithubSyncAutoIntervalHours {
  const raw = storage.getNumber(KEY_AUTO_INTERVAL_HOURS);
  if (raw === 12 || raw === 24 || raw === 72 || raw === 168) {
    return raw;
  }
  return DEFAULT_AUTO_INTERVAL_HOURS;
}

export function setGithubSyncAutoIntervalHours(hours: GithubSyncAutoIntervalHours): void {
  storage.set(KEY_AUTO_INTERVAL_HOURS, hours);
}

export function getGithubSyncLastAutoAttemptAt(): number | null {
  const raw = storage.getNumber(KEY_LAST_AUTO_ATTEMPT_AT);
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return raw;
}

export function setGithubSyncLastAutoAttemptAt(ms: number): void {
  storage.set(KEY_LAST_AUTO_ATTEMPT_AT, ms);
}

export function clearGithubSyncState(): void {
  storage.remove(KEY_LAST_COMMIT_SHA);
  storage.remove(KEY_LAST_SYNCED_AT);
  storage.remove(KEY_LAST_ERROR);
  storage.remove(KEY_CONTENT_HASHES);
  storage.remove(KEY_GITHUB_LOGIN);
  storage.remove(KEY_LAST_AUTO_ATTEMPT_AT);
}
