import { invalidateProEntitlementCache } from '@/lib/pro-entitlement';
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

type RcEntitlementPayload = {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
};

type RcSubscriberResponse = {
  subscriber?: {
    entitlements?: Record<string, RcEntitlementPayload>;
  };
};

function parseRcIsoDateMs(raw: string | null | undefined): number | null {
  if (raw == null || raw === '') {
    return null;
  }
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function entitlementAccessEndMs(ent: RcEntitlementPayload): number | null {
  const expMs = parseRcIsoDateMs(ent.expires_date);
  const graceMs = parseRcIsoDateMs(ent.grace_period_expires_date);
  const candidates = [expMs, graceMs].filter((n): n is number => n != null);

  if (candidates.length === 0) {
    return null;
  }

  return Math.max(...candidates);
}

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

  if (ent.expires_date == null || ent.expires_date === '') {
    return true;
  }

  const endMs = entitlementAccessEndMs(ent);
  if (endMs == null) {
    return null;
  }

  return endMs > Date.now();
}

/** License keys write DeviceProEntitlement directly; RC often has no subscriber for that app user id. */
async function hasConsumedProLicenseOnDevice(deviceId: string): Promise<boolean> {
  const row = await prisma.proLicenseKey.findFirst({
    where: { consumedByDeviceId: deviceId },
    select: { id: true },
  });
  return row != null;
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
    if (await hasConsumedProLicenseOnDevice(deviceId)) {
      return { ok: true, updated: false };
    }
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
      invalidateProEntitlementCache(deviceId);
    } catch {
      /* no row */
    }
    return { ok: true, updated: true };
  }

  const body = fetched.body;
  const ent = body.subscriber?.entitlements?.[entitlementId];
  if (!ent) {
    if (await hasConsumedProLicenseOnDevice(deviceId)) {
      return { ok: true, updated: false };
    }
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
      invalidateProEntitlementCache(deviceId);
    } catch {
      /* no row */
    }
    return { ok: true, updated: true };
  }

  if (ent.expires_date == null || ent.expires_date === '') {
    await prisma.deviceProEntitlement.upsert({
      where: { deviceId },
      create: { deviceId, expiresAt: LIFETIME_FAR },
      update: { expiresAt: LIFETIME_FAR },
    });
    invalidateProEntitlementCache(deviceId);
    return { ok: true, updated: true };
  }

  const endMs = entitlementAccessEndMs(ent);
  if (endMs == null) {
    return { ok: false, reason: 'invalid_expires_date' };
  }

  const expiresAt = new Date(endMs);
  const now = Date.now();

  if (endMs <= now) {
    if (await hasConsumedProLicenseOnDevice(deviceId)) {
      return { ok: true, updated: false };
    }
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
      invalidateProEntitlementCache(deviceId);
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
  invalidateProEntitlementCache(deviceId);
  return { ok: true, updated: true };
}
