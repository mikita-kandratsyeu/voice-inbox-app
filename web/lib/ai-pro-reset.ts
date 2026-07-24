import type { Prisma } from '@/generated/prisma/client';

import {
  buildProLimitResetSummary,
  parseProLimitResetSummary,
  proLimitResetSummaryToMetadata,
  type ProLimitResetSummary,
} from '@/lib/ai-pro-reset-summary';
import { patchAiUsageLedgerEntryMetadata } from '@/lib/ai-usage-ledger';
import { getUsage, resetCurrentWeekUsage, type AiUsage } from '@/lib/ai-rate-limit';
import { isProResetEligible } from '@/lib/ai-pro-reset-eligibility';
import { prisma } from '@/lib/prisma';
import { verifyAiResetPurchaseWithRevenueCat } from '@/lib/revenuecat-reset-purchase';
import { isProDevice } from '@/lib/pro-entitlement';

export type { ProLimitResetSummary } from '@/lib/ai-pro-reset-summary';

export type ApplyProLimitResetResult =
  | { ok: true; usage: AiUsage; alreadyApplied: boolean; reset: ProLimitResetSummary }
  | { ok: false; reason: string; status: 400 | 403 | 409 | 502 | 503 };

function successFromStoredPurchase(params: {
  usage: AiUsage;
  creditedAmount: number;
  metadata: unknown;
}): ApplyProLimitResetResult {
  return {
    ok: true,
    usage: params.usage,
    alreadyApplied: true,
    reset: parseProLimitResetSummary(params.metadata, {
      creditedAmount: params.creditedAmount,
      usage: params.usage,
    }),
  };
}

export async function applyProLimitResetPurchase(params: {
  deviceId: string;
  productIdentifier: string;
  transactionId: string;
}): Promise<ApplyProLimitResetResult> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { ok: false, reason: 'no_database', status: 503 };
  }

  const deviceId = params.deviceId.trim();
  const transactionId = params.transactionId.trim();
  const productIdentifier = params.productIdentifier.trim();

  const existing = await prisma.aiUsageResetPurchase.findUnique({
    where: { transactionId },
    select: { deviceId: true, creditedAmount: true, metadata: true },
  });

  if (existing) {
    if (existing.deviceId !== deviceId) {
      return { ok: false, reason: 'transaction_already_used', status: 409 };
    }

    const usage = await getUsage(deviceId);
    return successFromStoredPurchase({
      usage,
      creditedAmount: existing.creditedAmount,
      metadata: existing.metadata,
    });
  }

  const isPro = await isProDevice(deviceId);
  if (!isPro) {
    return { ok: false, reason: 'pro_required', status: 403 };
  }

  const usageBefore = await getUsage(deviceId);
  if (!isProResetEligible(usageBefore)) {
    return { ok: false, reason: 'limit_not_exhausted', status: 400 };
  }

  const verified = await verifyAiResetPurchaseWithRevenueCat({
    deviceId,
    productIdentifier,
    transactionId,
  });

  if (!verified.ok) {
    let status: 400 | 502 | 503 = 400;
    if (
      verified.reason === 'revenuecat_secret_not_configured' ||
      verified.reason === 'reset_product_not_configured'
    ) {
      status = 503;
    } else if (
      verified.reason === 'network_error' ||
      verified.reason.startsWith('revenuecat_http_')
    ) {
      status = 502;
    }
    return { ok: false, reason: verified.reason, status };
  }

  const purchaseMetadata: Prisma.InputJsonValue = {
    productIdentifier: verified.productIdentifier,
    transactionId: verified.transactionId,
  };

  const { credited, usage, ledgerEntryId } = await resetCurrentWeekUsage(deviceId, {
    operation: 'pro_limit_reset',
    description: 'Pro AI limit reset purchase',
    jobId: verified.transactionId,
    metadata: purchaseMetadata,
  });

  const reset = buildProLimitResetSummary({
    usageBefore,
    usageAfter: usage,
    restoredAmount: credited,
    ledgerEntryId,
  });

  const summaryMetadata = proLimitResetSummaryToMetadata(reset);
  const persistedMetadata: Prisma.InputJsonValue = {
    ...purchaseMetadata,
    ...summaryMetadata,
  };

  if (ledgerEntryId) {
    await patchAiUsageLedgerEntryMetadata({
      entryId: ledgerEntryId,
      metadata: summaryMetadata,
    });
  }

  try {
    await prisma.aiUsageResetPurchase.create({
      data: {
        deviceId,
        transactionId: verified.transactionId,
        productIdentifier: verified.productIdentifier,
        creditedAmount: credited,
        metadata: persistedMetadata,
      },
    });
  } catch (e) {
    const race = await prisma.aiUsageResetPurchase.findUnique({
      where: { transactionId: verified.transactionId },
      select: { deviceId: true, creditedAmount: true, metadata: true },
    });

    if (race && race.deviceId === deviceId) {
      const raceUsage = await getUsage(deviceId);
      return successFromStoredPurchase({
        usage: raceUsage,
        creditedAmount: race.creditedAmount,
        metadata: race.metadata,
      });
    }

    console.error('[ai-pro-reset] persist purchase', e);
    return { ok: false, reason: 'persist_failed', status: 502 };
  }

  return {
    ok: true,
    usage,
    alreadyApplied: false,
    reset,
  };
}
