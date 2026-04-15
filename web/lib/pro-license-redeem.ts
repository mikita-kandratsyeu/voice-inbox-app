import type { Prisma } from '@/generated/prisma/client';

import { addCalendarMonthsUtc, addUtcDays } from '@/lib/pro-license-expiry-math';
import { prisma } from '@/lib/prisma';

import { hashLicenseKey, normalizeLicenseKeyInput } from './pro-license-crypto';

const ALLOWED_MONTHS = new Set([1, 3, 6, 12]);
const ALLOWED_DAYS = new Set([1, 7, 14]);

export type RedeemOk = {
  ok: true;
  expiresAt: string;
  weeklyLimitPro: number;
};

export type ProLicenseRedeemErrorCode = 'invalid_key' | 'used_elsewhere' | 'server_error';

export type RedeemErr = {
  ok: false;
  error: string;
  code: ProLicenseRedeemErrorCode;
  status: number;
};

export async function redeemProLicenseKey(
  rawKey: string,
  deviceId: string,
  weeklyLimitPro: number,
): Promise<RedeemOk | RedeemErr> {
  const normalized = normalizeLicenseKeyInput(rawKey);
  if (normalized.length < 8) {
    return { ok: false, error: 'Invalid license key', code: 'invalid_key', status: 400 };
  }

  const keyHash = hashLicenseKey(normalized);

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const keyRow = await tx.proLicenseKey.findUnique({
        where: { keyHash },
      });

      if (!keyRow) {
        return { type: 'bad_key' as const };
      }

      if (keyRow.consumedAt != null && keyRow.consumedByDeviceId === deviceId) {
        const ent = await tx.deviceProEntitlement.findUnique({
          where: { deviceId },
        });
        const expiresAt = ent?.expiresAt ?? keyRow.consumedAt;
        return { type: 'idempotent' as const, expiresAt };
      }

      if (keyRow.consumedAt != null && keyRow.consumedByDeviceId !== deviceId) {
        return { type: 'used_elsewhere' as const };
      }

      const dayGrant = keyRow.durationDays;
      const useDays = dayGrant != null;
      if (useDays) {
        if (!ALLOWED_DAYS.has(dayGrant)) {
          return { type: 'bad_key' as const };
        }
      } else if (!ALLOWED_MONTHS.has(keyRow.durationMonths)) {
        return { type: 'bad_key' as const };
      }

      const now = new Date();
      const existing = await tx.deviceProEntitlement.findUnique({
        where: { deviceId },
      });

      const base =
        existing && existing.expiresAt.getTime() > now.getTime() ? existing.expiresAt : now;
      const newExpires = useDays
        ? addUtcDays(base, dayGrant)
        : addCalendarMonthsUtc(base, keyRow.durationMonths);

      await tx.proLicenseKey.update({
        where: { id: keyRow.id },
        data: {
          consumedAt: now,
          consumedByDeviceId: deviceId,
        },
      });

      await tx.deviceProEntitlement.upsert({
        where: { deviceId },
        create: { deviceId, expiresAt: newExpires },
        update: { expiresAt: newExpires },
      });

      return { type: 'success' as const, expiresAt: newExpires };
    });

    if (result.type === 'bad_key') {
      return { ok: false, error: 'Invalid license key', code: 'invalid_key', status: 400 };
    }
    if (result.type === 'used_elsewhere') {
      return {
        ok: false,
        error: 'This key is already activated on another device',
        code: 'used_elsewhere',
        status: 403,
      };
    }

    const expiresAt = result.expiresAt.toISOString();
    return { ok: true, expiresAt, weeklyLimitPro };
  } catch (e) {
    console.error('[redeemProLicenseKey]', e);
    return { ok: false, error: 'Could not activate license', code: 'server_error', status: 503 };
  }
}
