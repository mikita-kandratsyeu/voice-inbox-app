import dayjs from 'dayjs';

export function isValidDeadlineInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dayjs(value).isValid() && dayjs(value).format('YYYY-MM-DD') === value;
}

export function isPastDeadlineInput(value: string): boolean {
  return dayjs(value).isBefore(dayjs(), 'day');
}

export function isValidDeadlineTimeInput(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isPastDeadlineDateTimeInput(deadline: string, deadlineTime: string): boolean {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(deadlineTime);
  if (!dateMatch || !timeMatch) return false;

  const value = new Date(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );

  return value.getTime() <= Date.now();
}

export type TaskDeadlineValidationError = 'invalid' | 'pastDate' | 'pastDateTime';

export function validateTaskDeadlineFields(
  deadline: string,
  deadlineTime: string,
): TaskDeadlineValidationError | null {
  const trimmedDeadline = deadline.trim();
  const trimmedTime = deadlineTime.trim();

  if (trimmedDeadline.length === 0) return null;

  if (!isValidDeadlineInput(trimmedDeadline)) return 'invalid';
  if (trimmedTime.length > 0 && !isValidDeadlineTimeInput(trimmedTime)) return 'invalid';
  if (isPastDeadlineInput(trimmedDeadline)) return 'pastDate';
  if (trimmedTime.length > 0 && isPastDeadlineDateTimeInput(trimmedDeadline, trimmedTime)) {
    return 'pastDateTime';
  }

  return null;
}

export function taskDeadlineValidationErrorKey(error: TaskDeadlineValidationError): string {
  switch (error) {
    case 'invalid':
      return 'tasks.deadlineInvalid';
    case 'pastDate':
      return 'tasks.deadlinePastInvalid';
    case 'pastDateTime':
      return 'tasks.deadlineTimePastInvalid';
  }
}
