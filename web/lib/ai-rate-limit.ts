import {
  AI_AUTO_ORGANIZE_WEEKLY_KEY_PREFIX,
  AI_DEBIT_IDEMPOTENCY_TTL_SECONDS,
  AI_PERIOD_START_KEY_PREFIX,
  AI_USAGE_PERIOD_MS,
  AI_WEEKLY_KEY_PREFIX,
  WEEK_TTL_SECONDS,
} from '@/config/constants';
import { recordAiUsageLedgerEntry, type AiUsageLedgerContext } from '@/lib/ai-usage-ledger';
import { getAiWeeklyLimits, type AiWeeklyLimits } from '@/lib/app-config';
import { isProDevice } from '@/lib/pro-entitlement';
import { redis } from '@/lib/redis';

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  resetAtUtc: string;
};

export type CheckResult =
  | { allowed: true; usage: AiUsage; ledgerEntryId: string | null }
  | { allowed: false; usage: AiUsage };
export type AiLimitContext = {
  isPro: boolean;
  weeklyLimits: AiWeeklyLimits;
};

export type ResolvedDeviceUsagePeriod = {
  periodStartMs: number | null;
  resetAt: Date;
  usageKey: string;
  hasStarted: boolean;
};

const AI_DEBIT_KEY_PREFIX = 'ai_debit:';

const getUsageKey = (deviceId: string): string => `${AI_WEEKLY_KEY_PREFIX}${deviceId}`;

const getPeriodStartKey = (deviceId: string): string => `${AI_PERIOD_START_KEY_PREFIX}${deviceId}`;

export const getAutoOrganizeWeeklyKey = (deviceId: string): string =>
  `${AI_AUTO_ORGANIZE_WEEKLY_KEY_PREFIX}${deviceId}`;

const getDebitIdempotencyKey = (deviceId: string, ledger?: AiUsageLedgerContext): string | null => {
  const jobId = ledger?.jobId?.trim();
  const operation = ledger?.operation;
  if (!jobId || !operation) return null;

  return `${AI_DEBIT_KEY_PREFIX}${deviceId}:${operation}:${jobId}`;
};

const formatResetAtUtc = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');

  return `${y}-${m}-${d} ${h}:${min}:${s} UTC`;
};

export function computeResetAtFromPeriodStart(periodStartMs: number): Date {
  return new Date(periodStartMs + AI_USAGE_PERIOD_MS);
}

const readPeriodStartMs = async (deviceId: string): Promise<number | null> => {
  const raw = await redis.get(getPeriodStartKey(deviceId));
  if (!raw) return null;

  const ms = parseInt(raw, 10);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

const resetPeriodCounters = async (deviceId: string): Promise<void> => {
  await redis.set(getUsageKey(deviceId), '0');
  await redis.set(getAutoOrganizeWeeklyKey(deviceId), '0');
};

const rolloverPeriodIfNeeded = async (
  deviceId: string,
  periodStartMs: number,
  nowMs: number,
): Promise<number> => {
  if (nowMs < periodStartMs + AI_USAGE_PERIOD_MS) {
    return periodStartMs;
  }

  const elapsedPeriods = Math.floor((nowMs - periodStartMs) / AI_USAGE_PERIOD_MS);
  const newStart = periodStartMs + elapsedPeriods * AI_USAGE_PERIOD_MS;
  await redis.set(getPeriodStartKey(deviceId), String(newStart));
  await resetPeriodCounters(deviceId);
  return newStart;
};

/** Resolves the active rolling period without creating an anchor (safe for GET / usage reads). */
export async function resolveDeviceUsagePeriod(
  deviceId: string,
  nowMs: number = Date.now(),
): Promise<ResolvedDeviceUsagePeriod> {
  const usageKey = getUsageKey(deviceId);
  const periodStartMs = await readPeriodStartMs(deviceId);

  if (periodStartMs === null) {
    return {
      periodStartMs: null,
      resetAt: new Date(nowMs + AI_USAGE_PERIOD_MS),
      usageKey,
      hasStarted: false,
    };
  }

  const activeStart = await rolloverPeriodIfNeeded(deviceId, periodStartMs, nowMs);
  return {
    periodStartMs: activeStart,
    resetAt: computeResetAtFromPeriodStart(activeStart),
    usageKey,
    hasStarted: true,
  };
}

/** Creates or rolls over the personal period before the first debit of a window. */
const ensureDeviceUsagePeriodForDebit = async (
  deviceId: string,
  nowMs: number = Date.now(),
): Promise<ResolvedDeviceUsagePeriod> => {
  const usageKey = getUsageKey(deviceId);
  const periodStartMs = await readPeriodStartMs(deviceId);

  if (periodStartMs === null) {
    await redis.set(getPeriodStartKey(deviceId), String(nowMs));
    await redis.set(usageKey, '0');
    await redis.set(getAutoOrganizeWeeklyKey(deviceId), '0');
    return {
      periodStartMs: nowMs,
      resetAt: computeResetAtFromPeriodStart(nowMs),
      usageKey,
      hasStarted: true,
    };
  }

  const activeStart = await rolloverPeriodIfNeeded(deviceId, periodStartMs, nowMs);
  return {
    periodStartMs: activeStart,
    resetAt: computeResetAtFromPeriodStart(activeStart),
    usageKey,
    hasStarted: true,
  };
};

export function resolveWeeklyLimit(context: AiLimitContext): number {
  return context.isPro ? context.weeklyLimits.proWeeklyLimit : context.weeklyLimits.freeWeeklyLimit;
}

export async function getWeeklyLimitForDevice(
  deviceId: string,
  context?: AiLimitContext,
): Promise<number> {
  if (context) {
    return resolveWeeklyLimit(context);
  }

  const [weeklyLimits, pro] = await Promise.all([getAiWeeklyLimits(), isProDevice(deviceId)]);
  return resolveWeeklyLimit({ isPro: pro, weeklyLimits });
}

const buildUsage = (used: number, resetAt: Date, limit: number): AiUsage => ({
  used,
  limit,
  remaining: Math.max(0, limit - used),
  resetAt: resetAt.toISOString(),
  resetAtUtc: formatResetAtUtc(resetAt),
});

export const getUsage = async (deviceId: string, context?: AiLimitContext): Promise<AiUsage> => {
  const period = await resolveDeviceUsagePeriod(deviceId);
  const raw = await redis.get(period.usageKey);
  const used = raw ? parseInt(raw, 10) : 0;
  const limit = await getWeeklyLimitForDevice(deviceId, context);

  return buildUsage(Number.isFinite(used) ? used : 0, period.resetAt, limit);
};

export const checkAndIncrement = async (
  deviceId: string,
  context?: AiLimitContext,
  units: number = 1,
  ledger?: AiUsageLedgerContext,
): Promise<CheckResult> => {
  const amount = Math.max(1, Math.floor(units));
  const limit = await getWeeklyLimitForDevice(deviceId, context);
  const period = await ensureDeviceUsagePeriodForDebit(deviceId);
  const key = period.usageKey;
  const debitKey = getDebitIdempotencyKey(deviceId, ledger);
  const reservedDebitKey = debitKey
    ? await redis.setIfNotExists(debitKey, String(amount), {
        ex: AI_DEBIT_IDEMPOTENCY_TTL_SECONDS,
      })
    : true;

  const resetAt = period.resetAt;

  if (!reservedDebitKey) {
    const raw = await redis.get(key);
    const used = raw ? parseInt(raw, 10) : 0;
    return {
      allowed: true,
      usage: buildUsage(Number.isFinite(used) ? used : 0, resetAt, limit),
      ledgerEntryId: null,
    };
  }

  let reservation: { allowed: boolean; value: number };
  try {
    reservation = await redis.incrementWithinLimit(key, amount, limit, WEEK_TTL_SECONDS);
  } catch (err) {
    if (debitKey) {
      await redis.del(debitKey);
    }
    throw err;
  }

  if (!reservation.allowed) {
    if (debitKey) {
      await redis.del(debitKey);
    }
    return { allowed: false, usage: buildUsage(reservation.value, resetAt, limit) };
  }

  const ledgerEntryId = await recordAiUsageLedgerEntry({
    deviceId,
    kind: 'debit',
    operation: ledger?.operation,
    amount: -amount,
    jobId: ledger?.jobId,
    description: ledger?.description,
    metadata: ledger?.metadata,
  });

  return { allowed: true, usage: buildUsage(reservation.value, resetAt, limit), ledgerEntryId };
};

export const decrement = async (deviceId: string, ledger?: AiUsageLedgerContext): Promise<void> => {
  await decrementBy(deviceId, 1, ledger);
};

export const decrementBy = async (
  deviceId: string,
  units: number,
  ledger?: AiUsageLedgerContext,
): Promise<void> => {
  const amount = Math.max(1, Math.floor(units));
  const period = await resolveDeviceUsagePeriod(deviceId);
  if (!period.hasStarted) return;

  const refunded = (await redis.decrByWithFloor(period.usageKey, amount)).delta;
  const debitKey = getDebitIdempotencyKey(deviceId, ledger);
  if (debitKey) {
    await redis.del(debitKey);
  }

  await recordAiUsageLedgerEntry({
    deviceId,
    kind: 'refund',
    operation: ledger?.operation,
    amount: refunded,
    jobId: ledger?.jobId,
    description: ledger?.description,
    metadata: ledger?.metadata,
  });
};

export const addBonus = async (
  deviceId: string,
  amount: number,
  ledger?: AiUsageLedgerContext,
): Promise<number> => {
  const period = await resolveDeviceUsagePeriod(deviceId);
  if (!period.hasStarted) return 0;

  const bonusAmount = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
  const credited = (await redis.decrByWithFloor(period.usageKey, bonusAmount)).delta;

  await recordAiUsageLedgerEntry({
    deviceId,
    kind: 'credit',
    operation: ledger?.operation ?? 'bonus',
    amount: credited,
    jobId: ledger?.jobId,
    description: ledger?.description,
    metadata: ledger?.metadata,
  });

  return credited;
};

export const resetCurrentWeekUsage = async (
  deviceId: string,
  ledger?: AiUsageLedgerContext,
): Promise<{ credited: number; usage: AiUsage; ledgerEntryId: string | null }> => {
  const period = await resolveDeviceUsagePeriod(deviceId);
  const raw = await redis.get(period.usageKey);
  const usedBefore = raw ? parseInt(raw, 10) : 0;
  const used = Number.isFinite(usedBefore) && usedBefore > 0 ? usedBefore : 0;

  let credited = 0;
  let ledgerEntryId: string | null = null;
  if (used > 0) {
    credited = (await redis.decrByWithFloor(period.usageKey, used)).delta;
  }

  if (credited > 0) {
    ledgerEntryId = await recordAiUsageLedgerEntry({
      deviceId,
      kind: 'credit',
      operation: ledger?.operation ?? 'pro_limit_reset',
      amount: credited,
      jobId: ledger?.jobId,
      description: ledger?.description,
      metadata: ledger?.metadata,
    });
  }

  const usage = await getUsage(deviceId);
  return { credited, usage, ledgerEntryId };
};
