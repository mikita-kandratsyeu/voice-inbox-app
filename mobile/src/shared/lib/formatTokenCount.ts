/** Compact locale-aware token count for summary metadata. */
export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0';
  }
  return Math.floor(value).toLocaleString();
}
