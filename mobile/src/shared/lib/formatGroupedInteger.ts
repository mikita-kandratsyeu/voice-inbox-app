const THOUSANDS_GROUP = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Locale-aware integer grouping without Intl / `Number.prototype.toLocaleString`.
 * Hermes can expose a broken `Intl.NumberFormat` that crashes at runtime.
 */
export function formatGroupedInteger(value: number, locale?: string): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const negative = value < 0;
  const int = Math.floor(Math.abs(value));
  const separator = locale?.toLowerCase().startsWith('ru') ? '\u00a0' : ',';
  const grouped = String(int).replace(THOUSANDS_GROUP, separator);
  return negative ? `-${grouped}` : grouped;
}
