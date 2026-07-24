import type { TaskItem } from '@/entities/record';

import { applyTaskCompletion, applyTaskReopen, normalizeOutcomeText } from '../applyTaskCompletion';

describe('applyTaskCompletion', () => {
  const baseTask: TaskItem = {
    id: 'task-1',
    text: 'Call client',
    isDone: false,
  };

  it('marks task done with completedAt', () => {
    const result = applyTaskCompletion(baseTask);
    expect(result.isDone).toBe(true);
    expect(result.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('stores normalized outcome text', () => {
    const result = applyTaskCompletion(baseTask, { outcomeText: '  Agreed on 15%  ' });
    expect(result.outcomeText).toBe('Agreed on 15%');
  });

  it('links follow-up record id', () => {
    const result = applyTaskCompletion(baseTask, { outcomeRecordId: 'rec_follow' });
    expect(result.outcomeRecordId).toBe('rec_follow');
  });

  it('preserves existing completedAt when re-linking follow-up', () => {
    const done = applyTaskCompletion(baseTask);
    const completedAt = done.completedAt;
    const relinked = applyTaskCompletion(done, { outcomeRecordId: 'rec_new' });
    expect(relinked.completedAt).toBe(completedAt);
  });
});

describe('applyTaskReopen', () => {
  it('clears outcome fields', () => {
    const done: TaskItem = {
      id: 'task-1',
      text: 'Call client',
      isDone: true,
      completedAt: '2026-06-01T10:00:00.000Z',
      outcomeText: 'Done',
      outcomeRecordId: 'rec_follow',
    };

    const reopened = applyTaskReopen(done);
    expect(reopened.isDone).toBe(false);
    expect(reopened.completedAt).toBeNull();
    expect(reopened.outcomeText).toBeNull();
    expect(reopened.outcomeRecordId).toBeNull();
  });
});

describe('normalizeOutcomeText', () => {
  it('returns null for empty values', () => {
    expect(normalizeOutcomeText('   ')).toBeNull();
    expect(normalizeOutcomeText(null)).toBeNull();
  });
});
