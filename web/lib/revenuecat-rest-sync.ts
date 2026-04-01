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

type FetchSubscriberResult =
  | { kind: 'ok'; body: RcSubscriberResponse }
  | { kind: 'not_found' }
  | { kind: 'error'; reason: string }
  | { kind: 'no_secret' };

async function fetchRevenueCatSubscriberJson(deviceId: string): Promise<FetchSubscriberResult> {
  const secret = getSecretKey();
  if (!secret) {
    return { kind: 'no_secret' };
  }

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
    return { kind: 'error', reason: 'network_error' };
  }

  if (res.status === 404) {
    return { kind: 'not_found' };
  }

  if (!res.ok) {
    return { kind: 'error', reason: `revenuecat_http_${res.status}` };
  }

  try {
    const body = (await res.json()) as RcSubscriberResponse;

    return { kind: 'ok', body };
  } catch {
    return { kind: 'error', reason: 'invalid_json' };
  }
}

export async function isRevenueCatProEntitlementActiveForDevice(
  deviceId: string,
): Promise<boolean | null> {
  const fetched = await fetchRevenueCatSubscriberJson(deviceId);
  if (fetched.kind === 'no_secret' || fetched.kind === 'error') {
    return null;
  }
  if (fetched.kind === 'not_found') {
    return false;
  }

  const entitlementId = getEntitlementId();
  const ent = fetched.body.subscriber?.entitlements?.[entitlementId];
  if (!ent) {
    return false;
  }

  const expiresRaw = ent.expires_date;
  const now = Date.now();

  if (expiresRaw == null || expiresRaw === '') {
    return true;
  }

  const expiresAt = new Date(expiresRaw);
  if (!Number.isFinite(expiresAt.getTime())) {
    return null;
  }

  return expiresAt.getTime() > now;
}

export async function syncDeviceProEntitlementFromRevenueCatRest(
  deviceId: string,
): Promise<{ ok: true; updated: boolean } | { ok: false; reason: string }> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: 'no_database' };
  }

  const entitlementId = getEntitlementId();
  const fetched = await fetchRevenueCatSubscriberJson(deviceId);

  if (fetched.kind === 'no_secret') {
    return { ok: false, reason: 'revenuecat_secret_not_configured' };
  }

  if (fetched.kind === 'error') {
    return { ok: false, reason: fetched.reason };
  }

  if (fetched.kind === 'not_found') {
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
    } catch {
      /* no row */
    }
    return { ok: true, updated: true };
  }

  const body = fetched.body;
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
