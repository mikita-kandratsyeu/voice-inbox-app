import { timingSafeEqual } from 'node:crypto';

import { prisma } from '@/lib/prisma';

const LIFETIME_FAR = new Date('2100-01-01T00:00:00.000Z');

export type RevenueCatWebhookEvent = {
  type?: string;
  app_user_id?: string;
  expiration_at_ms?: number | null;
  entitlement_ids?: string[];
  entitlement_id?: string | null;
};

export type RevenueCatWebhookBody = {
  api_version?: string;
  event?: RevenueCatWebhookEvent;
};

function getEntitlementId(): string {
  return (process.env.REVENUECAT_ENTITLEMENT_ID ?? 'pro').trim() || 'pro';
}

function eventGrantsConfiguredEntitlement(event: RevenueCatWebhookEvent): boolean {
  const id = getEntitlementId();
  const ids = event.entitlement_ids;
  if (Array.isArray(ids) && ids.length > 0) {
    return ids.includes(id);
  }
  if (event.entitlement_id === id) {
    return true;
  }
  const purchaseLike = new Set([
    'INITIAL_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'NON_RENEWING_PURCHASE',
    'PRODUCT_CHANGE',
  ]);
  return purchaseLike.has(String(event.type ?? ''));
}

/**
 * RevenueCat sends the dashboard "authorization" value as the full Authorization header body.
 * It may be `Bearer <token>` or just `<token>` — accept both. Env should hold the same token
 * (with or without a `Bearer ` prefix; we normalize).
 */
export function verifyRevenueCatWebhookAuthorization(
  authorizationHeader: string | null,
  secret: string,
): boolean {
  const trimmed = secret.trim();
  if (!trimmed) {
    return false;
  }
  const token = trimmed.toLowerCase().startsWith('bearer ') ? trimmed.slice(7).trim() : trimmed;
  if (!token) {
    return false;
  }

  const got = (authorizationHeader ?? '').trim();
  const variants = [`Bearer ${token}`, token];

  for (const expected of variants) {
    try {
      const a = Buffer.from(got, 'utf8');
      const b = Buffer.from(expected, 'utf8');
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

export async function applyRevenueCatWebhookPayload(payload: unknown): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    return;
  }

  const body = payload as RevenueCatWebhookBody;
  const event = body?.event;
  if (!event || typeof event !== 'object') {
    return;
  }

  const deviceId = typeof event.app_user_id === 'string' ? event.app_user_id.trim() : '';
  if (!deviceId) {
    return;
  }

  const type = String(event.type ?? '');

  if (type === 'EXPIRATION') {
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
    } catch {
      console.error('[revenuecat-webhook]', 'delete', 'not found', deviceId);
    }
    return;
  }

  const expMs = event.expiration_at_ms;
  const now = Date.now();

  if (typeof expMs === 'number' && Number.isFinite(expMs)) {
    if (expMs > now) {
      if (!eventGrantsConfiguredEntitlement(event)) {
        return;
      }
      const expiresAt = new Date(expMs);
      await prisma.deviceProEntitlement.upsert({
        where: { deviceId },
        create: { deviceId, expiresAt },
        update: { expiresAt },
      });
      return;
    }
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
    } catch {
      console.error('[revenuecat-webhook]', 'delete', 'not found', deviceId);
    }
    return;
  }

  if (expMs === null && eventGrantsConfiguredEntitlement(event)) {
    await prisma.deviceProEntitlement.upsert({
      where: { deviceId },
      create: { deviceId, expiresAt: LIFETIME_FAR },
      update: { expiresAt: LIFETIME_FAR },
    });
  }
}
