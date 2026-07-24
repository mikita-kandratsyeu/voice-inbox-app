import { storage } from '@/shared/lib/async-storage/mmkv';

const KEY_ENABLED = 'icloudSync.enabled';
const KEY_LAST_VERSION_ID = 'icloudSync.lastVersionId';
const KEY_LAST_SYNCED_AT = 'icloudSync.lastSyncedAt';
const KEY_LAST_ERROR = 'icloudSync.lastError';
const KEY_CONTENT_HASHES = 'icloudSync.contentHashes';
const KEY_AUTO_ENABLED = 'icloudSync.autoEnabled';
const KEY_AUTO_INTERVAL_HOURS = 'icloudSync.autoIntervalHours';
const KEY_LAST_AUTO_ATTEMPT_AT = 'icloudSync.lastAutoAttemptAt';

export const ICLOUD_SYNC_AUTO_INTERVAL_OPTIONS = [12, 24, 72, 168] as const;
export type IcloudSyncAutoIntervalHours = (typeof ICLOUD_SYNC_AUTO_INTERVAL_OPTIONS)[number];
const DEFAULT_AUTO_INTERVAL_HOURS: IcloudSyncAutoIntervalHours = 24;

export function getIcloudSyncEnabled(): boolean {
  return storage.getBoolean(KEY_ENABLED) === true;
}

export function setIcloudSyncEnabled(enabled: boolean): void {
  storage.set(KEY_ENABLED, enabled);
}

export function getIcloudSyncLastVersionId(): string | null {
  const value = storage.getString(KEY_LAST_VERSION_ID);
  return value?.trim() || null;
}

export function setIcloudSyncLastVersionId(versionId: string): void {
  storage.set(KEY_LAST_VERSION_ID, versionId.trim());
}

export function getIcloudSyncLastSyncedAt(): string | null {
  const value = storage.getString(KEY_LAST_SYNCED_AT);
  return value?.trim() || null;
}

export function setIcloudSyncLastSyncedAt(iso: string): void {
  storage.set(KEY_LAST_SYNCED_AT, iso);
}

export function getIcloudSyncLastError(): string | null {
  const value = storage.getString(KEY_LAST_ERROR);
  return value?.trim() || null;
}

export function setIcloudSyncLastError(message: string | null): void {
  if (!message?.trim()) {
    storage.remove(KEY_LAST_ERROR);
    return;
  }
  storage.set(KEY_LAST_ERROR, message.trim());
}

export function getIcloudSyncContentHashes(): Record<string, string> {
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

export function setIcloudSyncContentHashes(hashes: Record<string, string>): void {
  storage.set(KEY_CONTENT_HASHES, JSON.stringify(hashes));
}

export function getIcloudSyncAutoEnabled(): boolean {
  return storage.getBoolean(KEY_AUTO_ENABLED) === true;
}

export function setIcloudSyncAutoEnabled(enabled: boolean): void {
  storage.set(KEY_AUTO_ENABLED, enabled);
}

export function getIcloudSyncAutoIntervalHours(): IcloudSyncAutoIntervalHours {
  const raw = storage.getNumber(KEY_AUTO_INTERVAL_HOURS);
  if (raw === 12 || raw === 24 || raw === 72 || raw === 168) {
    return raw;
  }
  return DEFAULT_AUTO_INTERVAL_HOURS;
}

export function setIcloudSyncAutoIntervalHours(hours: IcloudSyncAutoIntervalHours): void {
  storage.set(KEY_AUTO_INTERVAL_HOURS, hours);
}

export function getIcloudSyncLastAutoAttemptAt(): number | null {
  const raw = storage.getNumber(KEY_LAST_AUTO_ATTEMPT_AT);
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return raw;
}

export function setIcloudSyncLastAutoAttemptAt(ms: number): void {
  storage.set(KEY_LAST_AUTO_ATTEMPT_AT, ms);
}

export function clearIcloudSyncState(): void {
  storage.remove(KEY_LAST_VERSION_ID);
  storage.remove(KEY_LAST_SYNCED_AT);
  storage.remove(KEY_LAST_ERROR);
  storage.remove(KEY_CONTENT_HASHES);
  storage.remove(KEY_LAST_AUTO_ATTEMPT_AT);
}

export function disableIcloudSync(): void {
  storage.set(KEY_ENABLED, false);
  clearIcloudSyncState();
}
