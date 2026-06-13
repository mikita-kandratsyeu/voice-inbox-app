import { normalizeTaskDeadlineFields } from '@/shared/lib/normalizeTaskDeadlineFields';

describe('normalizeTaskDeadlineFields', () => {
  it('accepts YYYY-MM-DD date-only deadlines', () => {
    expect(normalizeTaskDeadlineFields('2026-06-13')).toEqual({ deadline: '2026-06-13' });
  });

  it('splits ISO datetime with timezone into local date and time', () => {
    const result = normalizeTaskDeadlineFields('2026-06-13T18:00:00+03:00');
    expect(result?.deadline).toBe('2026-06-13');
    expect(result?.deadlineTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it('splits ISO datetime without timezone', () => {
    expect(normalizeTaskDeadlineFields('2026-06-13T18:00:00')).toEqual({
      deadline: '2026-06-13',
      deadlineTime: '18:00',
    });
  });

  it('drops midnight time component', () => {
    expect(normalizeTaskDeadlineFields('2026-06-13T00:00:00')).toEqual({
      deadline: '2026-06-13',
    });
  });

  it('rejects invalid calendar dates and garbage', () => {
    expect(normalizeTaskDeadlineFields('2026-02-30')).toBeNull();
    expect(normalizeTaskDeadlineFields('tomorrow')).toBeNull();
    expect(normalizeTaskDeadlineFields('')).toBeNull();
    expect(normalizeTaskDeadlineFields('null')).toBeNull();
    expect(normalizeTaskDeadlineFields(null)).toBeNull();
  });
});
