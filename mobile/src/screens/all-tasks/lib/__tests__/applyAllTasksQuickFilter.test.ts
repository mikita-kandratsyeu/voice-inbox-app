import type { TaskItem } from '@/entities/record';

import {
  applyAllTasksQuickFilter,
  getTaskDeadlineSortTime,
  sortTaskRows,
} from '../applyAllTasksQuickFilter';
import type { TaskWithRecord } from '../../types';

function row(
  task: Partial<TaskItem>,
  recordCreatedAt = '2026-06-01T00:00:00.000Z',
): TaskWithRecord {
  return {
    recordId: 'rec-1',
    recordTitle: 'Note',
    recordCreatedAt,
    task: {
      id: task.id ?? 'task-1',
      text: task.text ?? 'Task',
      isDone: task.isDone ?? false,
      ...task,
    },
  };
}

describe('applyAllTasksQuickFilter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const rows: TaskWithRecord[] = [
    row({ id: 'overdue', deadline: '2026-06-08' }),
    row({ id: 'today', deadline: '2026-06-09' }),
    row({ id: 'high', deadline: '2026-06-15', priority: 'high' }),
    row({ id: 'no-date' }),
    row({ id: 'done', isDone: true, deadline: '2026-06-08' }),
  ];

  it('returns open tasks for all filter and hides done unless recently completed', () => {
    expect(applyAllTasksQuickFilter(rows, 'all', new Set())).toHaveLength(4);
    expect(applyAllTasksQuickFilter(rows, 'all', new Set(['done']))).toHaveLength(5);
  });

  it('filters overdue open tasks', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'overdue', new Set());
    expect(filtered.map((r) => r.task.id)).toEqual(['overdue']);
  });

  it('filters today open tasks', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'today', new Set());
    expect(filtered.map((r) => r.task.id)).toEqual(['today']);
  });

  it('filters high priority open tasks', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'highPriority', new Set());
    expect(filtered.map((r) => r.task.id)).toEqual(['high']);
  });

  it('filters tasks without deadline', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'noDate', new Set());
    expect(filtered.map((r) => r.task.id)).toEqual(['no-date']);
  });

  it('shows only done tasks for done filter', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'done', new Set());
    expect(filtered.map((r) => r.task.id)).toEqual(['done']);
  });

  it('keeps recently completed tasks visible in non-done filters', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'all', new Set(['done']));
    expect(filtered.map((r) => r.task.id)).toContain('done');
  });

  it('hides done tasks when not recently completed', () => {
    const filtered = applyAllTasksQuickFilter(rows, 'all', new Set());
    expect(filtered.map((r) => r.task.id)).not.toContain('done');
  });
});

describe('getTaskDeadlineSortTime', () => {
  it('sorts tasks without deadline last', () => {
    expect(getTaskDeadlineSortTime({ id: '1', text: 'x', isDone: false })).toBe(
      Number.POSITIVE_INFINITY,
    );
  });

  it('combines date with deadline time when present', () => {
    const ts = getTaskDeadlineSortTime({
      id: '1',
      text: 'x',
      isDone: false,
      deadline: '2026-06-15',
      deadlineTime: '14:30',
    });
    expect(ts).toBe(new Date(2026, 5, 15, 14, 30).getTime());
  });
});

describe('sortTaskRows', () => {
  it('sorts by deadline, then priority, then record age', () => {
    const sorted = [
      row({ id: 'later', deadline: '2026-06-20', priority: 'low' }, '2026-06-01T00:00:00.000Z'),
      row({ id: 'soon', deadline: '2026-06-10', priority: 'high' }, '2026-06-02T00:00:00.000Z'),
      row(
        { id: 'soon-medium', deadline: '2026-06-10', priority: 'medium' },
        '2026-06-03T00:00:00.000Z',
      ),
    ].sort(sortTaskRows);

    expect(sorted.map((r) => r.task.id)).toEqual(['soon', 'soon-medium', 'later']);
  });
});
