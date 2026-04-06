import type { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';

function subtractCalendarMonthsUtc(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() - months);
  if (d.getUTCDate() < day) {
    d.setUTCDate(0);
  }
  return d;
}

function subtractUtcDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export type ResetConsumedProLicenseResult =
  | { ok: true; keyId: string; previousDeviceId: string | null }
  | { ok: false; error: string; status: number };

export async function resetConsumedProLicenseKey(
  keyId: string,
): Promise<ResetConsumedProLicenseResult> {
  const trimmed = keyId.trim();
  if (!trimmed) {
    return { ok: false, error: 'Invalid id', status: 400 };
  }

  try {
    const outcome = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const keyRow = await tx.proLicenseKey.findUnique({
        where: { id: trimmed },
      });

      if (!keyRow) {
        return { type: 'not_found' as const };
      }

      if (keyRow.consumedAt == null) {
        return { type: 'not_redeemed' as const };
      }

      const deviceId = keyRow.consumedByDeviceId;
      const durationDays = keyRow.durationDays;

      if (deviceId) {
        const ent = await tx.deviceProEntitlement.findUnique({
          where: { deviceId },
        });
        if (ent) {
          const now = new Date();
          const adjusted =
            durationDays != null
              ? subtractUtcDays(ent.expiresAt, durationDays)
              : subtractCalendarMonthsUtc(ent.expiresAt, keyRow.durationMonths);
          if (adjusted.getTime() <= now.getTime()) {
            await tx.deviceProEntitlement.delete({ where: { deviceId } });
          } else {
            await tx.deviceProEntitlement.update({
              where: { deviceId },
              data: { expiresAt: adjusted },
            });
          }
        }
      }

      await tx.proLicenseKey.update({
        where: { id: keyRow.id },
        data: {
          consumedAt: null,
          consumedByDeviceId: null,
        },
      });

      return {
        type: 'success' as const,
        keyId: keyRow.id,
        previousDeviceId: deviceId,
      };
    });

    if (outcome.type === 'not_found') {
      return { ok: false, error: 'Key not found', status: 404 };
    }
    if (outcome.type === 'not_redeemed') {
      return { ok: false, error: 'Key is not redeemed', status: 400 };
    }

    return {
      ok: true,
      keyId: outcome.keyId,
      previousDeviceId: outcome.previousDeviceId,
    };
  } catch (e) {
    console.error('[resetConsumedProLicenseKey]', e);
    return { ok: false, error: 'Database error', status: 503 };
  }
}
