import type { FlattenedItem } from './inboxScreenTypes';

export const INBOX_LIST_BANNER_EVERY_N_RECORDS = 3;

export function injectInboxListBannerCard(
  items: FlattenedItem[],
  everyNthRecord: number = INBOX_LIST_BANNER_EVERY_N_RECORDS,
): FlattenedItem[] {
  if (everyNthRecord < 1) {
    return items;
  }

  let seenRecords = 0;
  let bannerSlot = 0;
  const out: FlattenedItem[] = [];

  for (const item of items) {
    out.push(item);
    if (item.type === 'record') {
      seenRecords += 1;
      if (seenRecords % everyNthRecord === 0) {
        out.push({ type: 'banner_card', slotIndex: bannerSlot });
        bannerSlot += 1;
      }
    }
  }

  return out;
}
