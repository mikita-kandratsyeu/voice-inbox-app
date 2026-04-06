import { prisma } from '@/lib/prisma';
import {
  generatePlainLicenseKey,
  hashLicenseKey,
  normalizeLicenseKeyInput,
} from '@/lib/pro-license-crypto';

export const ALLOWED_PRO_LICENSE_MONTHS = new Set([1, 3, 6, 12]);
export const ALLOWED_PRO_LICENSE_DAYS = new Set([1, 7, 14]);

export type ProLicenseDurationSpec =
  | { kind: 'months'; months: number }
  | { kind: 'days'; days: number };

export function parseProLicenseDurationMonths(raw: unknown): number | null {
  const n =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw.trim(), 10) : NaN;
  if (!Number.isFinite(n) || !ALLOWED_PRO_LICENSE_MONTHS.has(n)) return null;
  return n;
}

export function parseProLicenseDurationDays(raw: unknown): number | null {
  const n =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw.trim(), 10) : NaN;
  if (!Number.isFinite(n) || !ALLOWED_PRO_LICENSE_DAYS.has(n)) return null;
  return n;
}

/** Expect exactly one of durationMonths or durationDays in the JSON body. */
export function parseProLicenseDurationFromBody(body: {
  durationMonths?: unknown;
  durationDays?: unknown;
}): ProLicenseDurationSpec | null {
  const mRaw = body?.durationMonths;
  const dRaw = body?.durationDays;
  const hasM = mRaw !== undefined && mRaw !== null && mRaw !== '';
  const hasD = dRaw !== undefined && dRaw !== null && dRaw !== '';
  if (hasM === hasD) return null;
  if (hasD) {
    const d = parseProLicenseDurationDays(dRaw);
    return d == null ? null : { kind: 'days', days: d };
  }
  const m = parseProLicenseDurationMonths(mRaw);
  return m == null ? null : { kind: 'months', months: m };
}

export function formatProLicenseDurationShort(row: {
  durationMonths: number;
  durationDays: number | null;
}): string {
  if (row.durationDays != null) return `${row.durationDays} d`;
  return `${row.durationMonths} mo`;
}

export async function createProLicenseKeyRecord(
  adminId: string,
  duration: ProLicenseDurationSpec,
  opts?: { issuedToEmail?: string | null },
): Promise<{ plainKey: string; keyId: string }> {
  const plainKey = generatePlainLicenseKey();
  const keyHash = hashLicenseKey(normalizeLicenseKeyInput(plainKey));
  const issuedToEmail =
    typeof opts?.issuedToEmail === 'string' && opts.issuedToEmail.trim()
      ? opts.issuedToEmail.trim()
      : null;
  const durationMonths = duration.kind === 'months' ? duration.months : 0;
  const durationDays = duration.kind === 'days' ? duration.days : null;
  const row = await prisma.proLicenseKey.create({
    data: {
      keyHash,
      durationMonths,
      durationDays,
      createdByAdminId: adminId,
      ...(issuedToEmail != null ? { issuedToEmail } : {}),
    },
    select: { id: true },
  });
  return { plainKey, keyId: row.id };
}
