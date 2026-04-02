import type { FlattenedItem } from './inboxScreenTypes';

export const INBOX_LIST_BANNER_AFTER_RECORD_COUNT = 2;

export function injectInboxListBannerCard(
  items: FlattenedItem[],
  afterRecordCount: number = INBOX_LIST_BANNER_AFTER_RECORD_COUNT,
): FlattenedItem[] {
  if (afterRecordCount < 1) {
    return items;
  }

  let seenRecords = 0;
  let inserted = false;
  const out: FlattenedItem[] = [];

  for (const item of items) {
    out.push(item);
    if (item.type === 'record') {
      seenRecords += 1;
      if (!inserted && seenRecords === afterRecordCount) {
        out.push({ type: 'banner_card' });
        inserted = true;
      }
    }
  }

  return out;
}
