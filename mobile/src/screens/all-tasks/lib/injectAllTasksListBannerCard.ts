import { INBOX_LIST_BANNER_EVERY_N_RECORDS } from '@/screens/inbox/lib/injectInboxListBannerCard';

import type { TaskWithRecord } from '../types';

export type AllTasksFlattenedItem =
  | { type: 'section'; dayKey: string; title: string; isFirst: boolean }
  | { type: 'task'; row: TaskWithRecord };

export type AllTasksListItem = AllTasksFlattenedItem | { type: 'banner_card'; slotIndex: number };

export function injectAllTasksListBannerCard(
  items: AllTasksFlattenedItem[],
  everyNthTask: number = INBOX_LIST_BANNER_EVERY_N_RECORDS,
): AllTasksListItem[] {
  if (everyNthTask < 1) {
    return items;
  }

  let seenTasks = 0;
  let bannerSlot = 0;
  const out: AllTasksListItem[] = [];

  for (const item of items) {
    out.push(item);
    if (item.type === 'task') {
      seenTasks += 1;
      if (seenTasks % everyNthTask === 0) {
        out.push({ type: 'banner_card', slotIndex: bannerSlot });
        bannerSlot += 1;
      }
    }
  }

  return out;
}
