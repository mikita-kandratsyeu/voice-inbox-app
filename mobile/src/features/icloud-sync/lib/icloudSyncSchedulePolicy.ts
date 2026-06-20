import {
  getIcloudSyncAutoEnabled,
  getIcloudSyncAutoIntervalHours,
  getIcloudSyncEnabled,
  getIcloudSyncLastAutoAttemptAt,
  getIcloudSyncLastSyncedAt,
} from './icloudSyncState';

const MIN_AUTO_RETRY_MS = 60 * 60 * 1_000;

export function isIcloudSyncScheduleDue(now = Date.now()): boolean {
  if (!getIcloudSyncEnabled() || !getIcloudSyncAutoEnabled()) {
    return false;
  }

  const intervalHours = getIcloudSyncAutoIntervalHours();
  const intervalMs = intervalHours * 60 * 60 * 1_000;
  const lastAttemptAt = getIcloudSyncLastAutoAttemptAt();
  if (lastAttemptAt != null && now - lastAttemptAt < MIN_AUTO_RETRY_MS) {
    return false;
  }

  const lastSyncedAt = getIcloudSyncLastSyncedAt();
  if (!lastSyncedAt) {
    return true;
  }

  const lastSyncedMs = new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(lastSyncedMs)) {
    return true;
  }

  return now - lastSyncedMs >= intervalMs;
}
