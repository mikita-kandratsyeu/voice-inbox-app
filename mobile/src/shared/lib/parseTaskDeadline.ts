import dayjs from 'dayjs';

export function parseTaskDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline || typeof deadline !== 'string') return null;
  const parsed = dayjs(deadline, undefined, true);
  return parsed.isValid() ? parsed.toDate() : null;
}
