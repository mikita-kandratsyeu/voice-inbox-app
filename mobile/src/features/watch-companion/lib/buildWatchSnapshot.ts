import dayjs from 'dayjs';

import type { RecordListItem } from '@/entities/record';
import { sortTaskRows } from '@/screens/all-tasks/lib/applyAllTasksQuickFilter';
import { buildAllTasksRows } from '@/screens/all-tasks/lib/buildAllTasksRows';

import type { WatchNote, WatchSnapshot, WatchTask } from './watchPayload';

const MAX_TASKS = 15;
const MAX_NOTES = 8;
const MAX_SUMMARY_LENGTH = 160;

export function buildWatchSnapshot(records: RecordListItem[]): WatchSnapshot {
  const tasksToday = buildTodayTasks(records);
  const recentNotes = buildRecentNotes(records);

  return {
    updatedAt: new Date().toISOString(),
    tasksToday,
    recentNotes,
    schemaVersion: 1,
  };
}

function buildTodayTasks(records: RecordListItem[]): WatchTask[] {
  const rows = buildAllTasksRows(records, {
    effectiveActiveFolderId: null,
    quickFilter: 'today',
    recentlyCompleted: new Set(),
  });

  const sorted = rows.sort(sortTaskRows);
  const limited = sorted.slice(0, MAX_TASKS);

  return limited.map((row) => ({
    id: row.task.id,
    recordId: row.recordId,
    text: row.task.text,
    isCompleted: row.task.isDone,
    dueDate: row.task.deadline ? dayjs(row.task.deadline).format('YYYY-MM-DD') : null,
  }));
}

function buildRecentNotes(records: RecordListItem[]): WatchNote[] {
  const notes = records
    .filter((r) => r.status !== 'archived')
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
    .slice(0, MAX_NOTES);

  return notes.map((r) => ({
    id: r.id,
    title: r.title,
    summary: truncateSummary(r.summary || r.transcript || ''),
    createdAt: r.createdAt,
  }));
}

function truncateSummary(text: string): string {
  if (text.length <= MAX_SUMMARY_LENGTH) {
    return text;
  }
  return text.slice(0, MAX_SUMMARY_LENGTH - 3) + '...';
}
