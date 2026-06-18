import type { RecordListItem } from '@/entities/record';

import { buildWatchSnapshot } from '../buildWatchSnapshot';

describe('buildWatchSnapshot', () => {
  const mockRecordWithTask = (
    id: string,
    taskText: string,
    deadline?: string,
    isDone = false,
  ): RecordListItem => ({
    id,
    title: `Record ${id}`,
    transcript: 'test transcript',
    duration: '1:30',
    createdAt: '2024-01-15T10:00:00Z',
    status: 'unread' as const,
    tasks: [
      {
        id: `task-${id}`,
        text: taskText,
        isDone,
        deadline: deadline ?? null,
        deadlineTime: null,
        priority: undefined,
      },
    ],
  });

  const mockRecordNote = (id: string, title: string, summary?: string): RecordListItem => ({
    id,
    title,
    transcript: 'test',
    duration: '1:00',
    createdAt: '2024-01-15T10:00:00Z',
    status: 'unread' as const,
    summary,
  });

  it('should build snapshot with today tasks', () => {
    const today = new Date().toISOString().split('T')[0];
    const records = [
      mockRecordWithTask('rec1', 'Task for today', today),
      mockRecordWithTask('rec2', 'Task for tomorrow', '2099-12-31'),
    ];

    const snapshot = buildWatchSnapshot(records);

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.tasksToday).toHaveLength(1);
    expect(snapshot.tasksToday[0].text).toBe('Task for today');
  });

  it('should limit tasks to MAX_TASKS (15)', () => {
    const today = new Date().toISOString().split('T')[0];
    const records = Array.from({ length: 20 }, (_, i) =>
      mockRecordWithTask(`rec${i}`, `Task ${i}`, today),
    );

    const snapshot = buildWatchSnapshot(records);

    expect(snapshot.tasksToday.length).toBeLessThanOrEqual(15);
  });

  it('should exclude completed tasks from today filter', () => {
    const today = new Date().toISOString().split('T')[0];
    const records = [
      mockRecordWithTask('rec1', 'Done task', today, true),
      mockRecordWithTask('rec2', 'Active task', today, false),
    ];

    const snapshot = buildWatchSnapshot(records);

    expect(snapshot.tasksToday).toHaveLength(1);
    expect(snapshot.tasksToday[0].text).toBe('Active task');
  });

  it('should build recent notes (max 8)', () => {
    const records = Array.from({ length: 15 }, (_, i) =>
      mockRecordNote(`note${i}`, `Note ${i}`, `Summary ${i}`),
    );

    const snapshot = buildWatchSnapshot(records);

    expect(snapshot.recentNotes.length).toBeLessThanOrEqual(8);
  });

  it('should exclude archived notes', () => {
    const archived: RecordListItem = {
      ...mockRecordNote('archived', 'Archived note'),
      status: 'archived' as const,
    };
    const active = mockRecordNote('active', 'Active note');

    const snapshot = buildWatchSnapshot([archived, active]);

    expect(snapshot.recentNotes).toHaveLength(1);
    expect(snapshot.recentNotes[0].title).toBe('Active note');
  });

  it('should truncate long summaries to 160 chars', () => {
    const longSummary = 'a'.repeat(200);
    const record = mockRecordNote('note1', 'Note', longSummary);

    const snapshot = buildWatchSnapshot([record]);

    expect(snapshot.recentNotes[0].summary.length).toBeLessThanOrEqual(160);
    expect(snapshot.recentNotes[0].summary).toMatch(/\.\.\.$/);
  });

  it('should use transcript if no summary', () => {
    const record: RecordListItem = {
      id: 'note1',
      title: 'Note',
      transcript: 'This is transcript text',
      duration: '1:00',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'unread' as const,
      summary: undefined,
    };

    const snapshot = buildWatchSnapshot([record]);

    expect(snapshot.recentNotes[0].summary).toBe('This is transcript text');
  });

  it('should include task due date as ISO day', () => {
    const today = new Date().toISOString().slice(0, 10);
    const records = [mockRecordWithTask('rec1', 'Task', today)];

    const snapshot = buildWatchSnapshot(records);

    expect(snapshot.tasksToday[0]?.dueDate).toBe(today);
  });

  it('should handle records without tasks or summary', () => {
    const record: RecordListItem = {
      id: 'rec1',
      title: 'Empty',
      transcript: '',
      duration: '1:00',
      createdAt: '2024-01-15T10:00:00Z',
      status: 'unread' as const,
    };

    const snapshot = buildWatchSnapshot([record]);

    expect(snapshot.tasksToday).toHaveLength(0);
    expect(snapshot.recentNotes).toHaveLength(1);
    expect(snapshot.recentNotes[0].summary).toBe('');
  });
});
