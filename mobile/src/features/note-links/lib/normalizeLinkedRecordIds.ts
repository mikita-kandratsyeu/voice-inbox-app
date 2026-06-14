import { isString } from '@/shared/lib/type-guards';

const MAX_LINKED_RECORD_IDS = 200;

export function normalizeLinkedRecordIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const out: string[] = [];
  for (const item of raw) {
    if (!isString(item)) continue;
    const trimmed = item.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= MAX_LINKED_RECORD_IDS) break;
  }

  return out.length > 0 ? out : undefined;
}

export function appendLinkedRecordId(
  current: string[] | undefined,
  targetId: string,
  selfId: string,
): string[] | undefined {
  const trimmed = targetId.trim();
  if (!trimmed || trimmed === selfId) return current;

  const base = current ?? [];
  if (base.includes(trimmed)) return base.length > 0 ? base : undefined;

  const next = [...base, trimmed];
  return next.length > MAX_LINKED_RECORD_IDS ? next.slice(0, MAX_LINKED_RECORD_IDS) : next;
}

export function removeLinkedRecordId(
  current: string[] | undefined,
  targetId: string,
): string[] | undefined {
  if (!current?.length) return undefined;
  const next = current.filter((id) => id !== targetId);
  return next.length > 0 ? next : undefined;
}
