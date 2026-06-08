import { AI_WEEKLY_KEY_PREFIX, WEEK_TTL_SECONDS } from '@/config/constants';
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

const AI_DEBIT_KEY_PREFIX = 'ai_debit:';

const getDebitIdempotencyKey = (deviceId: string, ledger?: AiUsageLedgerContext): string | null => {
  const jobId = ledger?.jobId?.trim();
  const operation = ledger?.operation;
  if (!jobId || !operation) return null;

  return `${AI_DEBIT_KEY_PREFIX}${deviceId}:${operation}:${jobId}`;
};

const getIsoWeek = (date: Date): { year: number; week: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return { year: d.getUTCFullYear(), week: weekNo };
};

const getWeekKey = (deviceId: string): string => {
  const { year, week } = getIsoWeek(new Date());
  return `${AI_WEEKLY_KEY_PREFIX}${deviceId}:${year}:${week}`;
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

export const getResetAt = (): Date => {
  const now = new Date();
  const nextMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = nextMonday.getUTCDay();
  const daysToAdd = day === 0 ? 1 : 8 - day;
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysToAdd);
  nextMonday.setUTCHours(0, 0, 0, 0);

  return nextMonday;
};

export const getUsage = async (deviceId: string, context?: AiLimitContext): Promise<AiUsage> => {
  const key = getWeekKey(deviceId);
  const raw = await redis.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  const resetAt = getResetAt();
  const limit = await getWeeklyLimitForDevice(deviceId, context);

  return buildUsage(used, resetAt, limit);
};

export const checkAndIncrement = async (
  deviceId: string,
  context?: AiLimitContext,
  units: number = 1,
  ledger?: AiUsageLedgerContext,
): Promise<CheckResult> => {
  const amount = Math.max(1, Math.floor(units));
  const limit = await getWeeklyLimitForDevice(deviceId, context);
  const key = getWeekKey(deviceId);
  const debitKey = getDebitIdempotencyKey(deviceId, ledger);
  const reservedDebitKey = debitKey
    ? await redis.setIfNotExists(debitKey, String(amount), { ex: WEEK_TTL_SECONDS })
    : true;

  const resetAt = getResetAt();

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
  const key = getWeekKey(deviceId);
  const refunded = (await redis.decrByWithFloor(key, amount)).delta;
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
  const key = getWeekKey(deviceId);
  const bonusAmount = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
  const credited = (await redis.decrByWithFloor(key, bonusAmount)).delta;

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
): Promise<{ credited: number; usage: AiUsage }> => {
  const key = getWeekKey(deviceId);
  const raw = await redis.get(key);
  const usedBefore = raw ? parseInt(raw, 10) : 0;
  const used = Number.isFinite(usedBefore) && usedBefore > 0 ? usedBefore : 0;

  let credited = 0;
  if (used > 0) {
    credited = (await redis.decrByWithFloor(key, used)).delta;
  }

  if (credited > 0) {
    await recordAiUsageLedgerEntry({
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
  return { credited, usage };
};
