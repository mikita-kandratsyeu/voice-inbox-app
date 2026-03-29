import { prisma } from '@/lib/prisma';

const RC_API = 'https://api.revenuecat.com/v1';
const LIFETIME_FAR = new Date('2100-01-01T00:00:00.000Z');

function getEntitlementId(): string {
  return (process.env.REVENUECAT_ENTITLEMENT_ID ?? 'pro').trim() || 'pro';
}

function getSecretKey(): string | null {
  const k = process.env.REVENUECAT_SECRET_API_KEY?.trim();
  return k && k.length > 0 ? k : null;
}

type RcSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<
      string,
      {
        expires_date?: string | null;
      }
    >;
  };
};

export async function syncDeviceProEntitlementFromRevenueCatRest(
  deviceId: string,
): Promise<{ ok: true; updated: boolean } | { ok: false; reason: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: 'no_database' };
  }
  const secret = getSecretKey();
  if (!secret) {
    return { ok: false, reason: 'revenuecat_secret_not_configured' };
  }

  const entitlementId = getEntitlementId();
  const encoded = encodeURIComponent(deviceId);
  const url = `${RC_API}/subscribers/${encoded}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    return { ok: false, reason: 'network_error' };
  }

  if (res.status === 404) {
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
    } catch {
      /* no row */
    }
    return { ok: true, updated: true };
  }

  if (!res.ok) {
    return { ok: false, reason: `revenuecat_http_${res.status}` };
  }

  let body: RcSubscriberResponse;
  try {
    body = (await res.json()) as RcSubscriberResponse;
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }

  const ent = body.subscriber?.entitlements?.[entitlementId];
  if (!ent) {
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
    } catch {
      /* no row */
    }
    return { ok: true, updated: true };
  }

  const expiresRaw = ent.expires_date;
  const now = Date.now();

  if (expiresRaw == null || expiresRaw === '') {
    await prisma.deviceProEntitlement.upsert({
      where: { deviceId },
      create: { deviceId, expiresAt: LIFETIME_FAR },
      update: { expiresAt: LIFETIME_FAR },
    });
    return { ok: true, updated: true };
  }

  const expiresAt = new Date(expiresRaw);
  if (!Number.isFinite(expiresAt.getTime())) {
    return { ok: false, reason: 'invalid_expires_date' };
  }

  if (expiresAt.getTime() <= now) {
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
    } catch {
      /* no row */
    }
    return { ok: true, updated: true };
  }

  await prisma.deviceProEntitlement.upsert({
    where: { deviceId },
    create: { deviceId, expiresAt },
    update: { expiresAt },
  });
  return { ok: true, updated: true };
}
