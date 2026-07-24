import dayjs from 'dayjs';

export function formatTaskDeadlineDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDeadlineString(): string {
  return formatTaskDeadlineDate(new Date());
}

export function getTomorrowDeadlineString(): string {
  return formatTaskDeadlineDate(dayjs().add(1, 'day').toDate());
}
