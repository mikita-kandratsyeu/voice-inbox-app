import type { TaskItem } from '@/entities/record';

import { getAllTasksListBucket, getTaskDeadlineBucket } from '../groupTasksByDeadlineBucket';

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    text: 'Test',
    isDone: false,
    ...overrides,
  };
}

describe('getTaskDeadlineBucket', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns done for completed tasks regardless of deadline', () => {
    expect(getTaskDeadlineBucket(task({ isDone: true, deadline: '2020-01-01' }))).toBe('done');
  });

  it('returns noDate when deadline is missing or invalid', () => {
    expect(getTaskDeadlineBucket(task())).toBe('noDate');
    expect(getTaskDeadlineBucket(task({ deadline: '' }))).toBe('noDate');
    expect(getTaskDeadlineBucket(task({ deadline: 'not-a-date' }))).toBe('noDate');
  });

  it('classifies overdue, today, tomorrow, this week, and later', () => {
    expect(getTaskDeadlineBucket(task({ deadline: '2026-06-08' }))).toBe('overdue');
    expect(getTaskDeadlineBucket(task({ deadline: '2026-06-09' }))).toBe('today');
    expect(getTaskDeadlineBucket(task({ deadline: '2026-06-10' }))).toBe('tomorrow');
    expect(getTaskDeadlineBucket(task({ deadline: '2026-06-12' }))).toBe('thisWeek');
    expect(getTaskDeadlineBucket(task({ deadline: '2026-06-20' }))).toBe('later');
  });
});

describe('getAllTasksListBucket', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns pinned for open pinned tasks', () => {
    expect(getAllTasksListBucket(task({ isPinned: true, deadline: '2026-06-20' }))).toBe('pinned');
  });

  it('keeps done pinned tasks in the done bucket', () => {
    expect(
      getAllTasksListBucket(task({ isPinned: true, isDone: true, deadline: '2026-06-08' })),
    ).toBe('done');
  });

  it('falls back to deadline bucket for unpinned tasks', () => {
    expect(getAllTasksListBucket(task({ deadline: '2026-06-08' }))).toBe('overdue');
  });
});
