import {
  getGitlabSyncAutoEnabled,
  getGitlabSyncAutoIntervalHours,
  getGitlabSyncLastAutoAttemptAt,
  getGitlabSyncLastSyncedAt,
} from './gitlabSyncState';

const MIN_AUTO_RETRY_MS = 60 * 60 * 1_000;

export function isGitlabSyncScheduleDue(now = Date.now()): boolean {
  if (!getGitlabSyncAutoEnabled()) {
    return false;
  }

  const intervalHours = getGitlabSyncAutoIntervalHours();
  const intervalMs = intervalHours * 60 * 60 * 1_000;
  const lastAttemptAt = getGitlabSyncLastAutoAttemptAt();
  if (lastAttemptAt != null && now - lastAttemptAt < MIN_AUTO_RETRY_MS) {
    return false;
  }

  const lastSyncedAt = getGitlabSyncLastSyncedAt();
  if (!lastSyncedAt) {
    return true;
  }

  const lastSyncedMs = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(lastSyncedMs)) {
    return true;
  }

  return now - lastSyncedMs >= intervalMs;
}
