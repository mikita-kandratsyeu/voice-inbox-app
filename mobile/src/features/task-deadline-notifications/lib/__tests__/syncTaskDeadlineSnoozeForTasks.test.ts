import type { TaskItem } from '@/entities/record';

const mockStorageState = new Map<string, string>();

jest.mock('@/shared/lib/async-storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorageState.get(key),
    set: (key: string, value: string) => {
      mockStorageState.set(key, value);
    },
    remove: (key: string) => {
      mockStorageState.delete(key);
    },
  },
}));

import { syncTaskDeadlineSnoozeForTasks } from '../syncTaskDeadlineSnoozeForTasks';
import {
  getTaskDeadlineSnoozeMap,
  resetTaskDeadlineSnoozeStorageForTests,
} from '../taskDeadlineSnoozeStorage';

describe('syncTaskDeadlineSnoozeForTasks', () => {
  const now = Date.parse('2099-06-10T12:00:00');

  const baseTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
    id: 'task-1',
    text: 'Buy milk',
    isDone: false,
    deadline: '2099-06-15',
    deadlineTime: '10:30',
    ...overrides,
  });

  beforeEach(() => {
    resetTaskDeadlineSnoozeStorageForTests();
  });

  it('sets snooze to the future deadline timestamp when deadline changes', () => {
    const prev = [baseTask()];
    const next = [baseTask({ deadline: '2099-06-20', deadlineTime: '09:00' })];

    syncTaskDeadlineSnoozeForTasks(prev, next, now);

    expect(getTaskDeadlineSnoozeMap()).toEqual({
      'task-1': Date.parse('2099-06-20T09:00:00'),
    });
  });

  it('clears snooze when deadline is removed', () => {
    const prev = [baseTask()];
    const next = [baseTask({ deadline: null, deadlineTime: null })];

    syncTaskDeadlineSnoozeForTasks(prev, next, now);

    expect(getTaskDeadlineSnoozeMap()).toEqual({});
  });

  it('clears snooze when task is marked done', () => {
    const prev = [baseTask()];
    const next = [baseTask({ isDone: true })];

    syncTaskDeadlineSnoozeForTasks(prev, next, now);

    expect(getTaskDeadlineSnoozeMap()).toEqual({});
  });

  it('ignores tasks whose deadline fields did not change', () => {
    const tasks = [baseTask()];

    syncTaskDeadlineSnoozeForTasks(tasks, tasks, now);

    expect(getTaskDeadlineSnoozeMap()).toEqual({});
  });
});
