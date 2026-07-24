import { storage } from '@/shared/lib/async-storage/mmkv';

const KEY_LAST_COMMIT_SHA = 'gitlabSync.lastCommitSha';
const KEY_LAST_SYNCED_AT = 'gitlabSync.lastSyncedAt';
const KEY_LAST_ERROR = 'gitlabSync.lastError';
const KEY_CONTENT_HASHES = 'gitlabSync.contentHashes';
const KEY_GITLAB_LOGIN = 'gitlabSync.gitlabLogin';
const KEY_AUTO_ENABLED = 'gitlabSync.autoEnabled';
const KEY_AUTO_INTERVAL_HOURS = 'gitlabSync.autoIntervalHours';
const KEY_LAST_AUTO_ATTEMPT_AT = 'gitlabSync.lastAutoAttemptAt';

export const GITLAB_SYNC_AUTO_INTERVAL_OPTIONS = [12, 24, 72, 168] as const;
export type GitlabSyncAutoIntervalHours = (typeof GITLAB_SYNC_AUTO_INTERVAL_OPTIONS)[number];
const DEFAULT_AUTO_INTERVAL_HOURS: GitlabSyncAutoIntervalHours = 24;

export function getGitlabSyncLastCommitSha(): string | null {
  const value = storage.getString(KEY_LAST_COMMIT_SHA);
  return value?.trim() || null;
}

export function setGitlabSyncLastCommitSha(sha: string): void {
  storage.set(KEY_LAST_COMMIT_SHA, sha.trim());
}

export function getGitlabSyncLastSyncedAt(): string | null {
  const value = storage.getString(KEY_LAST_SYNCED_AT);
  return value?.trim() || null;
}

export function setGitlabSyncLastSyncedAt(iso: string): void {
  storage.set(KEY_LAST_SYNCED_AT, iso);
}

export function getGitlabSyncLastError(): string | null {
  const value = storage.getString(KEY_LAST_ERROR);
  return value?.trim() || null;
}

export function setGitlabSyncLastError(message: string | null): void {
  if (!message?.trim()) {
    storage.remove(KEY_LAST_ERROR);
    return;
  }
  storage.set(KEY_LAST_ERROR, message.trim());
}

export function getGitlabSyncContentHashes(): Record<string, string> {
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

export function setGitlabSyncContentHashes(hashes: Record<string, string>): void {
  storage.set(KEY_CONTENT_HASHES, JSON.stringify(hashes));
}

export function getGitlabSyncLogin(): string | null {
  const value = storage.getString(KEY_GITLAB_LOGIN);
  return value?.trim() || null;
}

export function setGitlabSyncLogin(login: string | null): void {
  const trimmed = login?.trim();
  if (!trimmed) {
    storage.remove(KEY_GITLAB_LOGIN);
    return;
  }
  storage.set(KEY_GITLAB_LOGIN, trimmed);
}

export function getGitlabSyncAutoEnabled(): boolean {
  return storage.getBoolean(KEY_AUTO_ENABLED) === true;
}

export function setGitlabSyncAutoEnabled(enabled: boolean): void {
  storage.set(KEY_AUTO_ENABLED, enabled);
}

export function getGitlabSyncAutoIntervalHours(): GitlabSyncAutoIntervalHours {
  const raw = storage.getNumber(KEY_AUTO_INTERVAL_HOURS);
  if (raw === 12 || raw === 24 || raw === 72 || raw === 168) {
    return raw;
  }
  return DEFAULT_AUTO_INTERVAL_HOURS;
}

export function setGitlabSyncAutoIntervalHours(hours: GitlabSyncAutoIntervalHours): void {
  storage.set(KEY_AUTO_INTERVAL_HOURS, hours);
}

export function getGitlabSyncLastAutoAttemptAt(): number | null {
  const raw = storage.getNumber(KEY_LAST_AUTO_ATTEMPT_AT);
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return raw;
}

export function setGitlabSyncLastAutoAttemptAt(ms: number): void {
  storage.set(KEY_LAST_AUTO_ATTEMPT_AT, ms);
}

export function clearGitlabSyncState(): void {
  storage.remove(KEY_LAST_COMMIT_SHA);
  storage.remove(KEY_LAST_SYNCED_AT);
  storage.remove(KEY_LAST_ERROR);
  storage.remove(KEY_CONTENT_HASHES);
  storage.remove(KEY_GITLAB_LOGIN);
  storage.remove(KEY_LAST_AUTO_ATTEMPT_AT);
}
