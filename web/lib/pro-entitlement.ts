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
