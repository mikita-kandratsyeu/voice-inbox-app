import type { TaskWithRecord } from '../../types';
import {
  buildTaskDeadlineDayMarkers,
  CALENDAR_OVERDUE_MARKER_COLOR,
  CALENDAR_TASK_MARKER_COLOR,
  getTaskMarkerDotColor,
} from '../buildTaskDeadlineDayMarkers';

function row(id: string, deadline: string, isDone = false): TaskWithRecord {
  return {
    recordId: 'rec-1',
    recordTitle: 'Note',
    recordCreatedAt: '2026-06-01T00:00:00.000Z',
    task: { id, text: 'Task', isDone, deadline },
  };
}

describe('buildTaskDeadlineDayMarkers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks overdue open tasks on their deadline day', () => {
    const markers = buildTaskDeadlineDayMarkers([row('t1', '2026-06-08')]);
    expect(markers.get('2026-06-08')).toEqual({ hasOverdue: true });
  });

  it('does not mark done tasks as overdue', () => {
    const markers = buildTaskDeadlineDayMarkers([row('t1', '2026-06-08', true)]);
    expect(markers.get('2026-06-08')).toEqual({ hasOverdue: false });
  });

  it('merges multiple tasks on the same day and keeps overdue flag', () => {
    const markers = buildTaskDeadlineDayMarkers([
      row('t1', '2026-06-10'),
      row('t2', '2026-06-08'),
      row('t3', '2026-06-10'),
    ]);

    expect(markers.get('2026-06-10')).toEqual({ hasOverdue: false });
    expect(markers.get('2026-06-08')).toEqual({ hasOverdue: true });
  });

  it('skips tasks without valid deadline', () => {
    const markers = buildTaskDeadlineDayMarkers([
      {
        recordId: 'rec-1',
        recordTitle: 'Note',
        recordCreatedAt: '2026-06-01T00:00:00.000Z',
        task: { id: 't1', text: 'Task', isDone: false },
      },
    ]);
    expect(markers.size).toBe(0);
  });
});

describe('getTaskMarkerDotColor', () => {
  it('returns null when marker is undefined', () => {
    expect(getTaskMarkerDotColor(undefined)).toBeNull();
  });

  it('returns red for overdue days and blue otherwise', () => {
    expect(getTaskMarkerDotColor({ hasOverdue: true })).toBe(CALENDAR_OVERDUE_MARKER_COLOR);
    expect(getTaskMarkerDotColor({ hasOverdue: false })).toBe(CALENDAR_TASK_MARKER_COLOR);
  });
});
