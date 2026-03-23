export type InboxFlattenedHeader = { type: 'header'; title: string; isFirst: boolean };

export type InboxFlattenedRecord<T> = { type: 'record'; item: T };

export type InboxFlattenedItem<T> = InboxFlattenedHeader | InboxFlattenedRecord<T>;

export function trimFlattenedInboxItems<T>(
  items: InboxFlattenedItem<T>[],
  maxRecords: number,
): InboxFlattenedItem<T>[] {
  if (maxRecords <= 0) {
    return [];
  }

  const result: InboxFlattenedItem<T>[] = [];
  let recordCount = 0;
  let pendingHeader: InboxFlattenedHeader | null = null;

  for (const item of items) {
    if (item.type === 'header') {
      pendingHeader = item;
      continue;
    }

    if (recordCount >= maxRecords) {
      break;
    }

    if (pendingHeader) {
      result.push(pendingHeader);
      pendingHeader = null;
    }

    result.push(item);
    recordCount += 1;
  }

  return result;
}

export function countFlattenedRecords<T>(items: InboxFlattenedItem<T>[]): number {
  return items.reduce((n, x) => n + (x.type === 'record' ? 1 : 0), 0);
}
