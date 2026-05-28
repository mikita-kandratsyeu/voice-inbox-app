import {
  DEFAULT_TASK_DEADLINE_HOUR,
  getTaskDeadlineTimestamp,
  parseTaskDeadlineTimeOfDay,
} from '@/shared/lib/taskDeadlineTimestamp';

describe('taskDeadlineTimestamp', () => {
  it('defaults missing time to 09:00', () => {
    expect(parseTaskDeadlineTimeOfDay(null)).toEqual({
      hours: DEFAULT_TASK_DEADLINE_HOUR,
      minutes: 0,
    });
  });

  it('returns future timestamp for valid deadline', () => {
    const now = Date.parse('2099-01-01T00:00:00');
    const ts = getTaskDeadlineTimestamp('2099-06-15', '14:30', now);

    expect(ts).toBe(Date.parse('2099-06-15T14:30:00'));
  });

  it('returns null for past deadlines', () => {
    const now = Date.parse('2099-06-16T00:00:00');
    expect(getTaskDeadlineTimestamp('2099-06-15', '14:30', now)).toBeNull();
  });
});
