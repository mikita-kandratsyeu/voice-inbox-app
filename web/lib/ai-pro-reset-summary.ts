import type { AiUsage } from '@/lib/ai-rate-limit';

export type ProLimitResetSummary = {
  restoredAmount: number;
  usedBefore: number;
  limit: number;
  remainingBefore: number;
  remainingAfter: number;
  ledgerEntryId: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const readNonNegativeInt = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

export function buildProLimitResetSummary(params: {
  usageBefore: AiUsage;
  usageAfter: AiUsage;
  restoredAmount: number;
  ledgerEntryId: string | null;
}): ProLimitResetSummary {
  return {
    restoredAmount: params.restoredAmount,
    usedBefore: params.usageBefore.used,
    limit: params.usageBefore.limit,
    remainingBefore: params.usageBefore.remaining,
    remainingAfter: params.usageAfter.remaining,
    ledgerEntryId: params.ledgerEntryId,
  };
}

export function proLimitResetSummaryToMetadata(
  summary: ProLimitResetSummary,
): Record<string, number | string | null> {
  return {
    restoredAmount: summary.restoredAmount,
    usedBefore: summary.usedBefore,
    limit: summary.limit,
    remainingBefore: summary.remainingBefore,
    remainingAfter: summary.remainingAfter,
    ledgerEntryId: summary.ledgerEntryId,
  };
}

export function parseProLimitResetSummary(
  metadata: unknown,
  fallback: { creditedAmount: number; usage: AiUsage },
): ProLimitResetSummary {
  if (isRecord(metadata)) {
    const restoredAmount = readNonNegativeInt(metadata.restoredAmount);
    const usedBefore = readNonNegativeInt(metadata.usedBefore);
    const limit = readNonNegativeInt(metadata.limit);
    const remainingBefore = readNonNegativeInt(metadata.remainingBefore);
    const remainingAfter = readNonNegativeInt(metadata.remainingAfter);
    const ledgerEntryId =
      typeof metadata.ledgerEntryId === 'string' && metadata.ledgerEntryId.trim()
        ? metadata.ledgerEntryId.trim()
        : null;

    if (
      restoredAmount != null &&
      usedBefore != null &&
      limit != null &&
      remainingBefore != null &&
      remainingAfter != null
    ) {
      return {
        restoredAmount,
        usedBefore,
        limit,
        remainingBefore,
        remainingAfter,
        ledgerEntryId,
      };
    }
  }

  const restoredAmount = Math.max(0, fallback.creditedAmount);
  return {
    restoredAmount,
    usedBefore: restoredAmount,
    limit: fallback.usage.limit,
    remainingBefore: Math.max(0, fallback.usage.limit - restoredAmount),
    remainingAfter: fallback.usage.remaining,
    ledgerEntryId: null,
  };
}
