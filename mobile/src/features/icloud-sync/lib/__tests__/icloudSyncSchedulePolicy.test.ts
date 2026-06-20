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

import { isIcloudSyncScheduleDue } from '../icloudSyncSchedulePolicy';
import {
  setIcloudSyncAutoEnabled,
  setIcloudSyncEnabled,
  setIcloudSyncLastAutoAttemptAt,
  setIcloudSyncLastSyncedAt,
} from '../icloudSyncState';

describe('isIcloudSyncScheduleDue', () => {
  beforeEach(() => {
    mockStorageState.clear();
    setIcloudSyncEnabled(false);
    setIcloudSyncAutoEnabled(false);
    setIcloudSyncLastSyncedAt('');
    setIcloudSyncLastAutoAttemptAt(0);
  });

  it('returns false when sync disabled', () => {
    expect(isIcloudSyncScheduleDue()).toBe(false);
  });

  it('returns true when enabled and never synced', () => {
    setIcloudSyncEnabled(true);
    setIcloudSyncAutoEnabled(true);
    expect(isIcloudSyncScheduleDue()).toBe(true);
  });

  it('returns false when last attempt was recent', () => {
    setIcloudSyncEnabled(true);
    setIcloudSyncAutoEnabled(true);
    setIcloudSyncLastAutoAttemptAt(Date.now());
    expect(isIcloudSyncScheduleDue()).toBe(false);
  });

  it('returns true when interval elapsed', () => {
    setIcloudSyncEnabled(true);
    setIcloudSyncAutoEnabled(true);
    setIcloudSyncLastSyncedAt(new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString());
    expect(isIcloudSyncScheduleDue()).toBe(true);
  });
});
