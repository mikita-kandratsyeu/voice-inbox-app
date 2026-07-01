import { prisma } from '@/lib/prisma';
import { isDevelopmentAppEnv } from './app-env';

const PRO_ENTITLEMENT_CACHE_TTL_MS = 60_000;

const proExpiresCache = new Map<string, { expiresAt: Date | null; loadedAt: number }>();

/** Clear cached Pro expiry after redeem, webhook sync, or admin reset. */
export function invalidateProEntitlementCache(deviceId?: string): void {
  if (deviceId) {
    proExpiresCache.delete(deviceId);
    return;
  }
  proExpiresCache.clear();
}

export async function getProExpiresAtUtc(deviceId: string): Promise<Date | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }

  const now = Date.now();
  const hit = proExpiresCache.get(deviceId);
  if (hit && now - hit.loadedAt < PRO_ENTITLEMENT_CACHE_TTL_MS) {
    return hit.expiresAt;
  }

  try {
    const row = await prisma.deviceProEntitlement.findUnique({
      where: { deviceId },
      select: { expiresAt: true },
    });
    const expiresAt = row?.expiresAt ?? null;
    proExpiresCache.set(deviceId, { expiresAt, loadedAt: now });
    return expiresAt;
  } catch {
    return null;
  }
}

export async function isProDevice(deviceId: string): Promise<boolean> {
  const expires = await getProExpiresAtUtc(deviceId);
  const isDev = isDevelopmentAppEnv();

  return isDev || (expires != null && expires.getTime() > Date.now());
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
