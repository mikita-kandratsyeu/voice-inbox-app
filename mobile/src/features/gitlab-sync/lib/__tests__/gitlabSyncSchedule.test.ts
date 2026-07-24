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

import { isGitlabSyncScheduleDue } from '../gitlabSyncSchedulePolicy';
import {
  getGitlabSyncAutoEnabled,
  getGitlabSyncLastAutoAttemptAt,
  setGitlabSyncAutoEnabled,
  setGitlabSyncAutoIntervalHours,
  setGitlabSyncLastAutoAttemptAt,
  setGitlabSyncLastSyncedAt,
} from '../gitlabSyncState';

describe('gitlabSyncSchedule', () => {
  beforeEach(() => {
    mockStorageState.clear();
    setGitlabSyncAutoEnabled(false);
    setGitlabSyncAutoIntervalHours(24);
    setGitlabSyncLastSyncedAt('');
    setGitlabSyncLastAutoAttemptAt(0);
  });

  it('returns false when auto sync is disabled', () => {
    setGitlabSyncAutoEnabled(false);
    expect(isGitlabSyncScheduleDue()).toBe(false);
  });

  it('returns true when enabled and never synced', () => {
    setGitlabSyncAutoEnabled(true);
    expect(isGitlabSyncScheduleDue()).toBe(true);
  });

  it('returns false when interval has not elapsed', () => {
    setGitlabSyncAutoEnabled(true);
    setGitlabSyncLastSyncedAt(new Date().toISOString());
    expect(isGitlabSyncScheduleDue()).toBe(false);
  });

  it('returns true when interval has elapsed', () => {
    setGitlabSyncAutoEnabled(true);
    const old = new Date(Date.now() - 25 * 60 * 60 * 1_000).toISOString();
    setGitlabSyncLastSyncedAt(old);
    expect(isGitlabSyncScheduleDue()).toBe(true);
  });

  it('throttles repeated attempts within an hour', () => {
    setGitlabSyncAutoEnabled(true);
    setGitlabSyncLastSyncedAt(new Date(Date.now() - 48 * 60 * 60 * 1_000).toISOString());
    setGitlabSyncLastAutoAttemptAt(Date.now() - 30 * 60 * 1_000);
    expect(isGitlabSyncScheduleDue()).toBe(false);
    expect(getGitlabSyncAutoEnabled()).toBe(true);
    expect(getGitlabSyncLastAutoAttemptAt()).not.toBeNull();
  });
});
