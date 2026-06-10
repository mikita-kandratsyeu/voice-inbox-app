const mockStorageState = new Map<string, string | number | boolean>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => {
      const value = mockStorageState.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key: string) => {
      const value = mockStorageState.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    getBoolean: (key: string) => {
      const value = mockStorageState.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    set: (key: string, value: string | number | boolean) => {
      mockStorageState.set(key, value);
    },
    remove: (key: string) => {
      mockStorageState.delete(key);
    },
  },
}));

import {
  getGithubSyncAutoEnabled,
  getGithubSyncLastAutoAttemptAt,
  setGithubSyncAutoEnabled,
  setGithubSyncAutoIntervalHours,
  setGithubSyncLastAutoAttemptAt,
  setGithubSyncLastSyncedAt,
} from '../githubSyncState';
import { isGithubSyncScheduleDue } from '../githubSyncSchedulePolicy';

describe('githubSyncSchedule', () => {
  beforeEach(() => {
    mockStorageState.clear();
    setGithubSyncAutoEnabled(false);
    setGithubSyncAutoIntervalHours(24);
    setGithubSyncLastSyncedAt('');
    setGithubSyncLastAutoAttemptAt(0);
  });

  it('returns false when auto sync is disabled', () => {
    setGithubSyncAutoEnabled(false);
    expect(isGithubSyncScheduleDue()).toBe(false);
  });

  it('returns true when enabled and never synced', () => {
    setGithubSyncAutoEnabled(true);
    expect(isGithubSyncScheduleDue()).toBe(true);
  });

  it('returns false when interval has not elapsed', () => {
    setGithubSyncAutoEnabled(true);
    setGithubSyncLastSyncedAt(new Date().toISOString());
    expect(isGithubSyncScheduleDue()).toBe(false);
  });

  it('returns true when interval has elapsed', () => {
    setGithubSyncAutoEnabled(true);
    const old = new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString();
    setGithubSyncLastSyncedAt(old);
    expect(isGithubSyncScheduleDue()).toBe(true);
  });

  it('throttles repeated attempts within an hour', () => {
    setGithubSyncAutoEnabled(true);
    setGithubSyncLastSyncedAt(new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString());
    setGithubSyncLastAutoAttemptAt(Date.now() - 30 * 60 * 1_000);
    expect(isGithubSyncScheduleDue()).toBe(false);
    expect(getGithubSyncAutoEnabled()).toBe(true);
    expect(getGithubSyncLastAutoAttemptAt()).not.toBeNull();
  });
});
