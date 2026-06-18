import { formatGroupedInteger } from './formatGroupedInteger';

/** Compact locale-aware token count for summary metadata. */
export function formatTokenCount(value: number, locale?: string): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0';
  }
  return formatGroupedInteger(value, locale);
}
