import { AI_WEEKLY_KEY_PREFIX, FREE_WEEKLY_LIMIT, WEEK_TTL_SECONDS } from '@/config/constants';
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

const buildUsage = (used: number, resetAt: Date): AiUsage => ({
  used: Math.min(used, FREE_WEEKLY_LIMIT),
  limit: FREE_WEEKLY_LIMIT,
  remaining: Math.max(0, FREE_WEEKLY_LIMIT - used),
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

  return buildUsage(used, resetAt);
};

export const checkAndIncrement = async (deviceId: string): Promise<CheckResult> => {
  const key = getWeekKey(deviceId);
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, WEEK_TTL_SECONDS);
  }

  const resetAt = getResetAt();
  const usage = buildUsage(count, resetAt);
  const allowed = count <= FREE_WEEKLY_LIMIT;

  if (!allowed) {
    await redis.decr(key);
    return { allowed: false, usage };
  }

  return { allowed: true, usage };
};

export const decrement = async (deviceId: string): Promise<void> => {
  const key = getWeekKey(deviceId);
  await redis.decr(key);
};
