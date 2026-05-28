import type { TaskItem } from '@/entities/record';

import { collectSchedulableTaskDeadlines } from '../collectSchedulableTaskDeadlines';
import { getTaskDeadlineNotificationId } from '../constants';

describe('collectSchedulableTaskDeadlines', () => {
  const baseTask = (overrides: Partial<TaskItem> = {}): TaskItem => ({
    id: 'task-1',
    text: 'Buy milk',
    isDone: false,
    deadline: '2099-06-15',
    deadlineTime: '10:30',
    ...overrides,
  });

  it('skips done tasks and tasks without deadlines', () => {
    const result = collectSchedulableTaskDeadlines(
      [
        {
          id: 'rec-1',
          title: 'Note',
          tasks: [
            baseTask({ isDone: true }),
            baseTask({ deadline: null }),
            baseTask({ id: 'task-2' }),
          ],
        },
      ],
      Date.parse('2099-01-01T00:00:00'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.task.id).toBe('task-2');
  });

  it('skips past deadlines', () => {
    const result = collectSchedulableTaskDeadlines(
      [
        {
          id: 'rec-1',
          title: 'Note',
          tasks: [baseTask({ deadline: '2020-01-01' })],
        },
      ],
      Date.parse('2099-01-01T00:00:00'),
    );

    expect(result).toHaveLength(0);
  });

  it('sorts by trigger time ascending', () => {
    const result = collectSchedulableTaskDeadlines(
      [
        {
          id: 'rec-1',
          title: 'Note',
          tasks: [
            baseTask({ id: 'later', deadline: '2099-06-20', deadlineTime: '09:00' }),
            baseTask({ id: 'earlier', deadline: '2099-06-10', deadlineTime: '09:00' }),
          ],
        },
      ],
      Date.parse('2099-01-01T00:00:00'),
    );

    expect(result.map((item) => item.task.id)).toEqual(['earlier', 'later']);
  });
});

describe('getTaskDeadlineNotificationId', () => {
  it('uses stable task-scoped ids', () => {
    expect(getTaskDeadlineNotificationId('abc-123')).toBe('task-deadline:abc-123');
  });
});
