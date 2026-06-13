import { normalizeTaskDeadlineFields } from './normalizeTaskDeadlineFields';

describe('normalizeTaskDeadlineFields', () => {
  it('accepts YYYY-MM-DD date-only deadlines', () => {
    expect(normalizeTaskDeadlineFields('2026-06-13')).toEqual({ deadline: '2026-06-13' });
  });

  it('splits ISO datetime without timezone', () => {
    expect(normalizeTaskDeadlineFields('2026-06-13T18:00:00')).toEqual({
      deadline: '2026-06-13',
      deadlineTime: '18:00',
    });
  });

  it('rejects invalid values', () => {
    expect(normalizeTaskDeadlineFields('2026-02-30')).toBeNull();
    expect(normalizeTaskDeadlineFields('tomorrow')).toBeNull();
  });
});
