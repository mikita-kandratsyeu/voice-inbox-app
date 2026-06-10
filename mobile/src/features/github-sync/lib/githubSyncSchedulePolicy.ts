import {
  getGithubSyncAutoEnabled,
  getGithubSyncAutoIntervalHours,
  getGithubSyncLastAutoAttemptAt,
  getGithubSyncLastSyncedAt,
} from './githubSyncState';

const MIN_AUTO_RETRY_MS = 60 * 60 * 1_000;

export function isGithubSyncScheduleDue(now = Date.now()): boolean {
  if (!getGithubSyncAutoEnabled()) {
    return false;
  }

  const intervalHours = getGithubSyncAutoIntervalHours();
  const intervalMs = intervalHours * 60 * 60 * 1_000;
  const lastAttemptAt = getGithubSyncLastAutoAttemptAt();
  if (lastAttemptAt != null && now - lastAttemptAt < MIN_AUTO_RETRY_MS) {
    return false;
  }

  const lastSyncedAt = getGithubSyncLastSyncedAt();
  if (!lastSyncedAt) {
    return true;
  }

  const lastSyncedMs = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(lastSyncedMs)) {
    return true;
  }

  return now - lastSyncedMs >= intervalMs;
}
