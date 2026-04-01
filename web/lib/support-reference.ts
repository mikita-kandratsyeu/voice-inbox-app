export const SUPPORT_REFERENCE_PREFIX = 'VI';

export function formatSupportReference(
  referenceNumber: number | null | undefined,
  fallbackRowId?: string,
): string {
  if (typeof referenceNumber === 'number' && Number.isFinite(referenceNumber)) {
    return `${SUPPORT_REFERENCE_PREFIX}-${referenceNumber}`;
  }

  if (fallbackRowId?.length) {
    return `${SUPPORT_REFERENCE_PREFIX}-${fallbackRowId.slice(0, 8)}`;
  }

  return `${SUPPORT_REFERENCE_PREFIX}-?`;
}

export function parseSupportReferenceQuery(q: string): number | null {
  const m = q.trim().match(new RegExp(`^${SUPPORT_REFERENCE_PREFIX}-(\\d+)$`, 'i'));

  if (!m) {
    return null;
  }

  const n = Number(m[1]);

  return Number.isFinite(n) && n >= 1 ? n : null;
}
