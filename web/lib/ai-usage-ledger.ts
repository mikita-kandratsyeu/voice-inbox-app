import type { Prisma } from '@/generated/prisma/client';

import { prisma } from '@/lib/prisma';

export type AiUsageLedgerKind = 'debit' | 'credit' | 'refund';

export type AiUsageOperation =
  | 'transcript_summarize'
  | 'transcript_summarize_meeting'
  | 'transcript_ask'
  | 'translate'
  | 'digest'
  | 'auto_organize'
  | 'meeting_dialogue'
  | 'bonus'
  | 'pro_limit_reset'
  | 'unknown';

export type AiUsageLedgerContext = {
  operation: AiUsageOperation;
  jobId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
};

export type AiUsageHistoryEntry = {
  id: string;
  createdAt: string;
  kind: AiUsageLedgerKind;
  operation: AiUsageOperation;
  amount: number;
  jobId?: string;
  description?: string;
  model?: string;
  modelLabel?: string;
};

export type AiUsageHistoryPage = {
  items: AiUsageHistoryEntry[];
  nextCursor: string | null;
};

export const DEFAULT_AI_USAGE_HISTORY_LIMIT = 25;
export const MAX_AI_USAGE_HISTORY_LIMIT = 50;

const normalizeLimit = (limit: number | null): number => {
  if (!Number.isFinite(limit ?? NaN)) return DEFAULT_AI_USAGE_HISTORY_LIMIT;
  return Math.min(MAX_AI_USAGE_HISTORY_LIMIT, Math.max(1, Math.floor(limit!)));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const readTrimmedString = (metadata: unknown, key: string): string | undefined => {
  if (!isRecord(metadata)) return undefined;
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

/** Ledger operation for summarize jobs that include meeting-mode speaker breakdown (2 credits). */
export function resolveTranscriptSummarizeLedgerOperation(
  chargedUsageUnits?: number | null,
): Extract<AiUsageOperation, 'transcript_summarize' | 'transcript_summarize_meeting'> {
  return typeof chargedUsageUnits === 'number' &&
    Number.isFinite(chargedUsageUnits) &&
    chargedUsageUnits >= 2
    ? 'transcript_summarize_meeting'
    : 'transcript_summarize';
}

export async function recordAiUsageLedgerEntry(params: {
  deviceId: string;
  kind: AiUsageLedgerKind;
  operation?: AiUsageOperation;
  amount: number;
  jobId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim() || params.amount === 0) return null;

  try {
    const row = await prisma.aiUsageLedgerEntry.create({
      data: {
        deviceId: params.deviceId,
        kind: params.kind,
        operation: params.operation ?? 'unknown',
        amount: params.amount,
        jobId: params.jobId,
        description: params.description,
        metadata: params.metadata,
      },
      select: { id: true },
    });
    return row.id;
  } catch (e) {
    console.error('[ai-usage-ledger]', params.kind, params.operation, e);
    return null;
  }
}

export async function patchAiUsageLedgerEntryMetadata(params: {
  entryId: string;
  metadata: Prisma.InputJsonValue;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  try {
    const existing = await prisma.aiUsageLedgerEntry.findUnique({
      where: { id: params.entryId },
      select: { metadata: true },
    });
    if (!existing) return;

    await prisma.aiUsageLedgerEntry.update({
      where: { id: params.entryId },
      data: {
        metadata: {
          ...(isRecord(existing.metadata) ? existing.metadata : {}),
          ...(isRecord(params.metadata) ? params.metadata : {}),
        },
      },
    });
  } catch (e) {
    console.error('[ai-usage-ledger:patch]', params.entryId, e);
  }
}

export async function updateAiUsageLedgerMetadata(params: {
  deviceId: string;
  operation: AiUsageOperation;
  entryId?: string | null;
  jobId?: string | null;
  metadata: Prisma.InputJsonValue;
}): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) return;

  try {
    const existing = await prisma.aiUsageLedgerEntry.findFirst({
      where: {
        deviceId: params.deviceId,
        kind: 'debit',
        operation: params.operation,
        ...(params.entryId ? { id: params.entryId } : {}),
        ...(!params.entryId && params.jobId ? { jobId: params.jobId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, metadata: true },
    });
    if (!existing) return;

    await prisma.aiUsageLedgerEntry.update({
      where: { id: existing.id },
      data: {
        metadata: {
          ...(isRecord(existing.metadata) ? existing.metadata : {}),
          ...(isRecord(params.metadata) ? params.metadata : {}),
        },
      },
    });
  } catch (e) {
    console.error('[ai-usage-ledger:update]', params.operation, e);
  }
}

export async function getAiUsageHistory(params: {
  deviceId: string;
  cursor?: string | null;
  limit?: number | null;
}): Promise<AiUsageHistoryPage> {
  if (!process.env.DATABASE_URL?.trim()) return { items: [], nextCursor: null };

  const limit = normalizeLimit(params.limit ?? null);
  const rows = await prisma.aiUsageLedgerEntry.findMany({
    where: { deviceId: params.deviceId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      kind: true,
      operation: true,
      amount: true,
      jobId: true,
      description: true,
      metadata: true,
    },
  });

  const pageRows = rows.slice(0, limit);
  const nextCursor = rows.length > limit ? (pageRows[pageRows.length - 1]?.id ?? null) : null;

  return {
    items: pageRows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      kind: row.kind as AiUsageLedgerKind,
      operation: row.operation as AiUsageOperation,
      amount: row.amount,
      ...(row.jobId ? { jobId: row.jobId } : {}),
      ...(row.description ? { description: row.description } : {}),
      ...(readTrimmedString(row.metadata, 'model')
        ? { model: readTrimmedString(row.metadata, 'model') }
        : {}),
      ...(readTrimmedString(row.metadata, 'modelLabel')
        ? { modelLabel: readTrimmedString(row.metadata, 'modelLabel') }
        : {}),
    })),
    nextCursor,
  };
}
