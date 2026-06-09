import {
  isPastDeadlineDateTimeInput,
  isPastDeadlineInput,
  isValidDeadlineInput,
  isValidDeadlineTimeInput,
  taskDeadlineValidationErrorKey,
  validateTaskDeadlineFields,
} from '../validateTaskDeadlineInput';

describe('validateTaskDeadlineInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-09T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isValidDeadlineInput', () => {
    it('accepts valid calendar dates', () => {
      expect(isValidDeadlineInput('2026-06-15')).toBe(true);
    });

    it('rejects malformed or impossible dates', () => {
      expect(isValidDeadlineInput('2026-13-01')).toBe(false);
      expect(isValidDeadlineInput('06-15-2026')).toBe(false);
      expect(isValidDeadlineInput('')).toBe(false);
    });
  });

  describe('isValidDeadlineTimeInput', () => {
    it('accepts 24h times', () => {
      expect(isValidDeadlineTimeInput('09:30')).toBe(true);
      expect(isValidDeadlineTimeInput('23:59')).toBe(true);
    });

    it('rejects invalid times', () => {
      expect(isValidDeadlineTimeInput('24:00')).toBe(false);
      expect(isValidDeadlineTimeInput('9:30')).toBe(false);
    });
  });

  describe('isPastDeadlineInput', () => {
    it('detects past dates', () => {
      expect(isPastDeadlineInput('2026-06-08')).toBe(true);
      expect(isPastDeadlineInput('2026-06-09')).toBe(false);
      expect(isPastDeadlineInput('2026-06-10')).toBe(false);
    });
  });

  describe('isPastDeadlineDateTimeInput', () => {
    it('detects past date-time on today', () => {
      expect(isPastDeadlineDateTimeInput('2026-06-09', '10:00')).toBe(true);
      expect(isPastDeadlineDateTimeInput('2026-06-09', '14:00')).toBe(false);
    });
  });

  describe('validateTaskDeadlineFields', () => {
    it('returns null for empty deadline', () => {
      expect(validateTaskDeadlineFields('', '')).toBeNull();
      expect(validateTaskDeadlineFields('  ', '  ')).toBeNull();
    });

    it('returns invalid for bad date or time', () => {
      expect(validateTaskDeadlineFields('bad', '')).toBe('invalid');
      expect(validateTaskDeadlineFields('2026-06-15', '99:99')).toBe('invalid');
    });

    it('returns pastDate for dates before today', () => {
      expect(validateTaskDeadlineFields('2026-06-08', '')).toBe('pastDate');
    });

    it('returns pastDateTime when time on today is in the past', () => {
      expect(validateTaskDeadlineFields('2026-06-09', '10:00')).toBe('pastDateTime');
    });

    it('accepts future date-time', () => {
      expect(validateTaskDeadlineFields('2026-06-15', '18:00')).toBeNull();
    });
  });

  describe('taskDeadlineValidationErrorKey', () => {
    it('maps errors to i18n keys', () => {
      expect(taskDeadlineValidationErrorKey('invalid')).toBe('tasks.deadlineInvalid');
      expect(taskDeadlineValidationErrorKey('pastDate')).toBe('tasks.deadlinePastInvalid');
      expect(taskDeadlineValidationErrorKey('pastDateTime')).toBe('tasks.deadlineTimePastInvalid');
    });
  });
});
