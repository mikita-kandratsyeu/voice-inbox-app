import { AI_WEEKLY_KEY_PREFIX, WEEK_TTL_SECONDS } from '@/config/constants';
import { getAiWeeklyLimits } from '@/lib/app-config';
import { isProDevice } from '@/lib/pro-entitlement';
import { redis } from '@/lib/redis';

export type AiUsage = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  resetAtUtc: string;
};

export type CheckResult = { allowed: true; usage: AiUsage } | { allowed: false; usage: AiUsage };

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

export async function getWeeklyLimitForDevice(deviceId: string): Promise<number> {
  const { freeWeeklyLimit, proWeeklyLimit } = await getAiWeeklyLimits();
  const pro = await isProDevice(deviceId);
  return pro ? proWeeklyLimit : freeWeeklyLimit;
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

export const getUsage = async (deviceId: string): Promise<AiUsage> => {
  const key = getWeekKey(deviceId);
  const raw = await redis.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  const resetAt = getResetAt();
  const limit = await getWeeklyLimitForDevice(deviceId);

  return buildUsage(used, resetAt, limit);
};

export const checkAndIncrement = async (deviceId: string): Promise<CheckResult> => {
  const limit = await getWeeklyLimitForDevice(deviceId);
  const key = getWeekKey(deviceId);
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WEEK_TTL_SECONDS);
  }

  const resetAt = getResetAt();
  const allowed = count <= limit;

  if (!allowed) {
    await redis.decr(key);
    return { allowed: false, usage: buildUsage(count - 1, resetAt, limit) };
  }

  return { allowed: true, usage: buildUsage(count, resetAt, limit) };
};

export const decrement = async (deviceId: string): Promise<void> => {
  const key = getWeekKey(deviceId);
  await redis.decr(key);
};

export const addBonus = async (deviceId: string, amount: number): Promise<void> => {
  const key = getWeekKey(deviceId);
  const raw = await redis.get(key);
  const used = raw ? parseInt(raw, 10) : 0;
  const newUsed = Math.max(0, used - amount);
  await redis.set(key, String(newUsed), { ex: WEEK_TTL_SECONDS });
};
