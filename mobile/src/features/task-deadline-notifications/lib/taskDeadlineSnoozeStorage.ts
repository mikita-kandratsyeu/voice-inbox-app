import { storage } from '@/shared/lib/async-storage/mmkv';

const KEY_SNOOZE_MAP = 'taskDeadlineNotifications.snoozeMap';

export type TaskDeadlineSnoozeMap = Record<string, number>;

function readSnoozeMap(): TaskDeadlineSnoozeMap {
  const raw = storage.getString(KEY_SNOOZE_MAP);
  if (!raw) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed == null) return {};

    const out: TaskDeadlineSnoozeMap = {};
    for (const [taskId, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        out[taskId] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeSnoozeMap(map: TaskDeadlineSnoozeMap): void {
  const keys = Object.keys(map);
  if (keys.length === 0) {
    storage.remove(KEY_SNOOZE_MAP);
    return;
  }
  storage.set(KEY_SNOOZE_MAP, JSON.stringify(map));
}

export function getTaskDeadlineSnoozeMap(): TaskDeadlineSnoozeMap {
  return readSnoozeMap();
}

export function getTaskDeadlineSnoozeUntil(taskId: string): number | undefined {
  const value = readSnoozeMap()[taskId];
  return value != null && Number.isFinite(value) ? value : undefined;
}

export function setTaskDeadlineSnooze(taskId: string, triggerAtMs: number): void {
  const map = readSnoozeMap();
  map[taskId] = triggerAtMs;
  writeSnoozeMap(map);
}

export function clearTaskDeadlineSnooze(taskId: string): void {
  const map = readSnoozeMap();
  if (!(taskId in map)) return;
  delete map[taskId];
  writeSnoozeMap(map);
}

export function clearAllTaskDeadlineSnoozes(): void {
  storage.remove(KEY_SNOOZE_MAP);
}

export function pruneExpiredTaskDeadlineSnoozes(nowMs: number = Date.now()): TaskDeadlineSnoozeMap {
  const map = readSnoozeMap();
  let changed = false;

  for (const [taskId, triggerAt] of Object.entries(map)) {
    if (triggerAt <= nowMs) {
      delete map[taskId];
      changed = true;
    }
  }

  if (changed) {
    writeSnoozeMap(map);
  }

  return map;
}

export function resetTaskDeadlineSnoozeStorageForTests(): void {
  storage.remove(KEY_SNOOZE_MAP);
}
