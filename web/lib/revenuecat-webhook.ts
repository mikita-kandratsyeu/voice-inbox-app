import { timingSafeEqual } from 'node:crypto';

import { invalidateProEntitlementCache } from '@/lib/pro-entitlement';
import { prisma } from '@/lib/prisma';
import { isAiResetProductId } from '@/lib/revenuecat-reset-purchase';

const LIFETIME_FAR = new Date('2100-01-01T00:00:00.000Z');

export type RevenueCatWebhookEvent = {
  type?: string;
  app_user_id?: string;
  expiration_at_ms?: number | null;
  grace_period_expiration_at_ms?: number | null;
  cancel_reason?: string | null;
  entitlement_ids?: string[];
  entitlement_id?: string | null;
  product_id?: string | null;
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
  return false;
}

function finiteMs(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

function webhookAccessEndMs(event: RevenueCatWebhookEvent): number | null {
  const exp = finiteMs(event.expiration_at_ms);
  const grace = finiteMs(event.grace_period_expiration_at_ms);
  const parts = [exp, grace].filter((v): v is number => v != null);

  if (parts.length === 0) {
    return null;
  }

  return Math.max(...parts);
}

function shouldApplyWebhookToConfiguredEntitlement(event: RevenueCatWebhookEvent): boolean {
  if (eventGrantsConfiguredEntitlement(event)) {
    return true;
  }

  return String(event.type ?? '') === 'BILLING_ISSUE';
}

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

  if (isAiResetProductId(event.product_id)) {
    return;
  }

  if (type === 'EXPIRATION') {
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
      invalidateProEntitlementCache(deviceId);
    } catch {
      console.error('[revenuecat-webhook]', 'delete', 'not found', deviceId);
    }
    return;
  }

  const now = Date.now();
  const accessEndMs = webhookAccessEndMs(event);

  if (accessEndMs != null) {
    if (accessEndMs > now) {
      if (!shouldApplyWebhookToConfiguredEntitlement(event)) {
        return;
      }
      const expiresAt = new Date(accessEndMs);
      await prisma.deviceProEntitlement.upsert({
        where: { deviceId },
        create: { deviceId, expiresAt },
        update: { expiresAt },
      });
      invalidateProEntitlementCache(deviceId);
      return;
    }

    if (type === 'CANCELLATION' && String(event.cancel_reason ?? '') === 'BILLING_ERROR') {
      return;
    }
    try {
      await prisma.deviceProEntitlement.delete({ where: { deviceId } });
      invalidateProEntitlementCache(deviceId);
    } catch {
      console.error('[revenuecat-webhook]', 'delete', 'not found', deviceId);
    }
    return;
  }

  const expMs = event.expiration_at_ms;
  if (expMs === null && eventGrantsConfiguredEntitlement(event)) {
    await prisma.deviceProEntitlement.upsert({
      where: { deviceId },
      create: { deviceId, expiresAt: LIFETIME_FAR },
      update: { expiresAt: LIFETIME_FAR },
    });
    invalidateProEntitlementCache(deviceId);
  }
}
