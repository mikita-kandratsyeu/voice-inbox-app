/**
 * Human-readable share of `bytes` in `totalBytes` for storage breakdown UI.
 * Tiny non-zero shares are shown as `atMostOneLabel` (e.g. "≤1%") instead of "0.0%"…"1.0%".
 */
export function formatStorageSharePercent(
  bytes: number,
  totalBytes: number,
  atMostOneLabel: string,
): string {
  if (totalBytes <= 0 || bytes <= 0) return '0.0%';
  const pct = (bytes / totalBytes) * 100;
  if (pct > 0 && pct <= 1) return atMostOneLabel;
  return `${pct.toFixed(1)}%`;
}
