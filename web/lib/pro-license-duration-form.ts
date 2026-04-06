/** Admin UI helpers — safe for client components (no Prisma). */

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
