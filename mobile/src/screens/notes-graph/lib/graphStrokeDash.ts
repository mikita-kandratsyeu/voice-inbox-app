export function parseStrokeDashIntervals(strokeDasharray?: string): number[] | null {
  if (!strokeDasharray) return null;

  const intervals = strokeDasharray
    .trim()
    .split(/[\s,]+/)
    .map((value) => Number.parseFloat(value))
    .filter((value) => Number.isFinite(value) && value > 0);

  return intervals.length > 0 ? intervals : null;
}
