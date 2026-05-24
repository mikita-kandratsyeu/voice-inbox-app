/** Admin UI helpers — safe for client components (no Prisma). */

export const PRO_LICENSE_DURATION_OPTIONS = [
  { value: 'd:1', label: '1 day' },
  { value: 'd:7', label: '7 days' },
  { value: 'd:14', label: '14 days' },
  { value: 'm:1', label: '1 month' },
  { value: 'm:3', label: '3 months' },
  { value: 'm:6', label: '6 months' },
  { value: 'm:12', label: '12 months' },
] as const;

export function proLicenseDurationSelectToRequestBody(
  raw: string,
): { durationMonths: number } | { durationDays: number } | null {
  if (raw.startsWith('d:')) {
    const d = parseInt(raw.slice(2), 10);
    if (![1, 7, 14].includes(d)) return null;
    return { durationDays: d };
  }
  if (raw.startsWith('m:')) {
    const m = parseInt(raw.slice(2), 10);
    if (![1, 3, 6, 12].includes(m)) return null;
    return { durationMonths: m };
  }
  return null;
}

export function formatSupportProKeySentLabel(months: number | null, days: number | null): string {
  if (days != null) return `${days} d`;
  if (months != null) return `${months} mo`;
  return '?';
}

export function formatProLicenseRowDuration(months: number, days: number | null): string {
  if (days != null) return `${days} d`;
  return `${months} mo`;
}
