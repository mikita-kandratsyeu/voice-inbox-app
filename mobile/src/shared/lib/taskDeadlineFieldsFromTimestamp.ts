import { formatTaskDeadlineDate } from './formatTaskDeadlineDate';

export type TaskDeadlineFields = {
  deadline: string;
  deadlineTime: string;
};

/** Maps a local timestamp to canonical task deadline storage fields. */
export function taskDeadlineFieldsFromTimestamp(timestampMs: number): TaskDeadlineFields {
  const date = new Date(timestampMs);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');

  return {
    deadline: formatTaskDeadlineDate(date),
    deadlineTime: `${hours}:${minutes}`,
  };
}
