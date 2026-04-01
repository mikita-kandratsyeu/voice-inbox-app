export const SUPPORT_REFERENCE_PREFIX = 'VI';

export function formatSupportReference(referenceNumber: number): string {
  return `${SUPPORT_REFERENCE_PREFIX}-${referenceNumber}`;
}

export function parseSupportReferenceQuery(q: string): number | null {
  const m = q.trim().match(new RegExp(`^${SUPPORT_REFERENCE_PREFIX}-(\\d+)$`, 'i'));

  if (!m) {
    return null;
  }

  const n = Number(m[1]);

  return Number.isFinite(n) && n >= 1 ? n : null;
}
