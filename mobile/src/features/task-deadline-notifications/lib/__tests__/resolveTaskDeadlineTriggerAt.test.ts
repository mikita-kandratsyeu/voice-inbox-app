import {
  getTaskDeadlineSnoozeTriggerAt,
  getTaskDeadlineTomorrowMorningTriggerAt,
  resolveTaskDeadlineTriggerAt,
  TASK_DEADLINE_SNOOZE_15M_MS,
} from '../resolveTaskDeadlineTriggerAt';

describe('resolveTaskDeadlineTriggerAt', () => {
  const now = Date.parse('2099-06-10T12:00:00');

  it('returns future deadline when no snooze is active', () => {
    const deadlineAt = now + 60 * 60 * 1000;
    expect(resolveTaskDeadlineTriggerAt(deadlineAt, undefined, now)).toBe(deadlineAt);
  });

  it('returns snooze when deadline already passed', () => {
    const snoozeAt = now + 30 * 60 * 1000;
    expect(resolveTaskDeadlineTriggerAt(null, snoozeAt, now)).toBe(snoozeAt);
  });

  it('uses the later of deadline and snooze when both are active', () => {
    const deadlineAt = now + 60 * 60 * 1000;
    const snoozeAt = now + 2 * 60 * 60 * 1000;
    expect(resolveTaskDeadlineTriggerAt(deadlineAt, snoozeAt, now)).toBe(snoozeAt);
  });

  it('ignores expired snooze values', () => {
    const deadlineAt = now + 60 * 60 * 1000;
    expect(resolveTaskDeadlineTriggerAt(deadlineAt, now - 1000, now)).toBe(deadlineAt);
  });
});

describe('snooze trigger helpers', () => {
  it('adds offset for short snooze presets', () => {
    const now = Date.parse('2099-06-10T12:00:00');
    expect(getTaskDeadlineSnoozeTriggerAt(TASK_DEADLINE_SNOOZE_15M_MS, now)).toBe(
      now + TASK_DEADLINE_SNOOZE_15M_MS,
    );
  });

  it('schedules tomorrow morning at 9:00', () => {
    const now = Date.parse('2099-06-10T12:00:00');
    expect(getTaskDeadlineTomorrowMorningTriggerAt(now)).toBe(Date.parse('2099-06-11T09:00:00'));
  });
});
