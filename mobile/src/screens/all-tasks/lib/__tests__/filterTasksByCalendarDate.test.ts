import type { TaskWithRecord } from '../../types';
import { filterTasksByCalendarDate } from '../filterTasksByCalendarDate';

function row(id: string, deadline: string): TaskWithRecord {
  return {
    recordId: 'rec-1',
    recordTitle: 'Note',
    recordCreatedAt: '2026-06-01T00:00:00.000Z',
    task: { id, text: 'Task', isDone: false, deadline },
  };
}

describe('filterTasksByCalendarDate', () => {
  const rows = [row('t1', '2026-06-09'), row('t2', '2026-06-10'), row('t3', 'not-a-date')];

  it('keeps tasks whose deadline falls on the selected day', () => {
    const filtered = filterTasksByCalendarDate(rows, new Date('2026-06-09T15:30:00'));
    expect(filtered.map((r) => r.task.id)).toEqual(['t1']);
  });

  it('excludes tasks without valid deadline', () => {
    const filtered = filterTasksByCalendarDate(rows, new Date('2026-01-01T00:00:00'));
    expect(filtered).toHaveLength(0);
  });
});
