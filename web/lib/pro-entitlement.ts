import { prisma } from '@/lib/prisma';

export async function getProExpiresAtUtc(deviceId: string): Promise<Date | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }
  try {
    const row = await prisma.deviceProEntitlement.findUnique({
      where: { deviceId },
      select: { expiresAt: true },
    });
    if (!row) return null;
    return row.expiresAt;
  } catch {
    return null;
  }
}

export async function isProDevice(deviceId: string): Promise<boolean> {
  const expires = await getProExpiresAtUtc(deviceId);
  return expires != null && expires.getTime() > Date.now();
}

export async function deviceHasActivatedLicenseKey(deviceId: string): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) {
    return false;
  }

  try {
    const row = await prisma.proLicenseKey.findFirst({
      where: { consumedByDeviceId: deviceId },
      select: { id: true },
    });

    return row != null;
  } catch {
    return false;
  }
}

export type ProActivationKind = 'voucher' | 'license' | 'store';

export async function getProActivationKind(deviceId: string): Promise<ProActivationKind | null> {
  const active = await isProDevice(deviceId);
  if (!active) {
    return null;
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return 'store';
  }

  try {
    const row = await prisma.proLicenseKey.findFirst({
      where: { consumedByDeviceId: deviceId },
      select: { voucherBatchId: true },
    });

    if (row != null) {
      return row.voucherBatchId != null ? 'voucher' : 'license';
    }
  } catch {
    // fall through to store
  }

  return 'store';
}
