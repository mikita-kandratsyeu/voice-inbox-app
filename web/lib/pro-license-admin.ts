import { prisma } from '@/lib/prisma';
import {
  generatePlainLicenseKey,
  hashLicenseKey,
  normalizeLicenseKeyInput,
} from '@/lib/pro-license-crypto';

export const ALLOWED_PRO_LICENSE_MONTHS = new Set([1, 3, 6, 12]);

export function parseProLicenseDurationMonths(raw: unknown): number | null {
  const n =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw.trim(), 10) : NaN;
  if (!Number.isFinite(n) || !ALLOWED_PRO_LICENSE_MONTHS.has(n)) return null;
  return n;
}

export async function createProLicenseKeyRecord(
  adminId: string,
  durationMonths: number,
  opts?: { issuedToEmail?: string | null },
): Promise<{ plainKey: string; keyId: string }> {
  const plainKey = generatePlainLicenseKey();
  const keyHash = hashLicenseKey(normalizeLicenseKeyInput(plainKey));
  const issuedToEmail =
    typeof opts?.issuedToEmail === 'string' && opts.issuedToEmail.trim()
      ? opts.issuedToEmail.trim()
      : null;
  const row = await prisma.proLicenseKey.create({
    data: {
      keyHash,
      durationMonths,
      createdByAdminId: adminId,
      ...(issuedToEmail != null ? { issuedToEmail } : {}),
    },
    select: { id: true },
  });
  return { plainKey, keyId: row.id };
}
