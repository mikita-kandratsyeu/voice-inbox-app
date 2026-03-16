import dayjs from 'dayjs';

import { isString } from './type-guards';

export function parseTaskDeadline(deadline: string | null | undefined): Date | null {
  if (!deadline || !isString(deadline)) return null;
  const parsed = dayjs(deadline, undefined, true);
  return parsed.isValid() ? parsed.toDate() : null;
}
