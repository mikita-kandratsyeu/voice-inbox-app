import type { RecordListItem } from '@/entities/record';

import { buildAllTasksRows } from '../buildAllTasksRows';

function record(overrides: Partial<RecordListItem> = {}): RecordListItem {
  return {
    id: 'rec-1',
    title: 'Note',
    transcript: '',
    duration: '0:30',
    createdAt: '2026-06-01T10:00:00.000Z',
    status: 'unread',
    tasks: [{ id: 'task-1', text: 'Task', isDone: false }],
    ...overrides,
  };
}

const defaultOptions = {
  effectiveActiveFolderId: null as string | null,
  quickFilter: 'all' as const,
  recentlyCompleted: new Set<string>(),
};

describe('buildAllTasksRows', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('excludes archived records and records without tasks', () => {
    const rows = buildAllTasksRows(
      [
        record({ id: 'archived', status: 'archived' }),
        record({ id: 'empty', tasks: [] }),
        record({ id: 'active' }),
      ],
      defaultOptions,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.recordId).toBe('active');
  });

  it('filters by active folder and record id', () => {
    const records = [
      record({ id: 'a', folderId: 'folder-a' }),
      record({ id: 'b', folderId: 'folder-b', tasks: [{ id: 't2', text: 'B', isDone: false }] }),
    ];

    const byFolder = buildAllTasksRows(records, {
      ...defaultOptions,
      effectiveActiveFolderId: 'folder-a',
    });
    expect(byFolder).toHaveLength(1);
    expect(byFolder[0]?.recordId).toBe('a');

    const byRecord = buildAllTasksRows(records, {
      ...defaultOptions,
      recordFilterId: 'b',
    });
    expect(byRecord).toHaveLength(1);
    expect(byRecord[0]?.recordId).toBe('b');
  });

  it('sorts records by createdAt descending and flattens tasks', () => {
    const rows = buildAllTasksRows(
      [
        record({
          id: 'older',
          createdAt: '2026-06-01T10:00:00.000Z',
          tasks: [
            { id: 't1', text: 'First', isDone: false },
            { id: 't2', text: 'Second', isDone: false },
          ],
        }),
        record({
          id: 'newer',
          createdAt: '2026-06-05T10:00:00.000Z',
          tasks: [{ id: 't3', text: 'Third', isDone: false }],
        }),
      ],
      defaultOptions,
    );

    expect(rows.map((r) => r.task.id)).toEqual(['t3', 't1', 't2']);
  });

  it('applies quick filter to flattened rows', () => {
    const rows = buildAllTasksRows(
      [
        record({
          tasks: [
            { id: 'overdue', text: 'Late', isDone: false, deadline: '2026-06-08' },
            { id: 'today', text: 'Now', isDone: false, deadline: '2026-06-09' },
          ],
        }),
      ],
      { ...defaultOptions, quickFilter: 'today' },
    );

    expect(rows.map((r) => r.task.id)).toEqual(['today']);
  });
});
