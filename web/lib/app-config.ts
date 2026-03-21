import {
  AI_BONUS_AMOUNT,
  AI_BONUS_COOLDOWN_KEY_PREFIX,
  AI_BONUS_COOLDOWN_SECONDS,
  FREE_WEEKLY_LIMIT,
  PRO_WEEKLY_LIMIT,
} from '@/config/constants';
import { prisma } from '@/lib/prisma';

export const BONUS_APP_CONFIG_KEYS = {
  AI_BONUS_AMOUNT: 'AI_BONUS_AMOUNT',
  AI_BONUS_COOLDOWN_SECONDS: 'AI_BONUS_COOLDOWN_SECONDS',
  AI_BONUS_COOLDOWN_KEY_PREFIX: 'AI_BONUS_COOLDOWN_KEY_PREFIX',
} as const;

export const WEEKLY_LIMIT_APP_CONFIG_KEYS = {
  AI_WEEKLY_LIMIT_FREE: 'AI_WEEKLY_LIMIT_FREE',
  AI_WEEKLY_LIMIT_PRO: 'AI_WEEKLY_LIMIT_PRO',
} as const;

const CONFIG_KEYS = BONUS_APP_CONFIG_KEYS;

async function getConfigValue(key: string, fallback: string): Promise<string> {
  if (!process.env.DATABASE_URL?.trim()) {
    return fallback;
  }

  try {
    const row = await prisma.appConfig.findUnique({ where: { key } });
    if (row?.value?.trim()) {
      return row.value.trim();
    }
  } catch {
    console.error('[getConfigValue]', key, 'error');

    return fallback;
  }

  return fallback;
}

export type BonusConfig = {
  amount: number;
  cooldownSeconds: number;
  cooldownKeyPrefix: string;
};

export async function getBonusConfig(): Promise<BonusConfig> {
  const [amountStr, cooldownStr, prefix] = await Promise.all([
    getConfigValue(CONFIG_KEYS.AI_BONUS_AMOUNT, String(AI_BONUS_AMOUNT)),
    getConfigValue(CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS, String(AI_BONUS_COOLDOWN_SECONDS)),
    getConfigValue(CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX, AI_BONUS_COOLDOWN_KEY_PREFIX),
  ]);

  const amount = Math.max(1, parseInt(amountStr, 10) || AI_BONUS_AMOUNT);
  const cooldownSeconds = Math.max(60, parseInt(cooldownStr, 10) || AI_BONUS_COOLDOWN_SECONDS);
  const cooldownKeyPrefix = prefix || AI_BONUS_COOLDOWN_KEY_PREFIX;

  return { amount, cooldownSeconds, cooldownKeyPrefix };
}

export type AiWeeklyLimits = {
  freeWeeklyLimit: number;
  proWeeklyLimit: number;
};

const LIMIT_MIN = 1;
const LIMIT_MAX = 500;

export async function getAiWeeklyLimits(): Promise<AiWeeklyLimits> {
  const [freeStr, proStr] = await Promise.all([
    getConfigValue(WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_FREE, String(FREE_WEEKLY_LIMIT)),
    getConfigValue(WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_PRO, String(PRO_WEEKLY_LIMIT)),
  ]);

  let freeWeeklyLimit = parseInt(freeStr, 10);
  let proWeeklyLimit = parseInt(proStr, 10);
  if (!Number.isFinite(freeWeeklyLimit)) freeWeeklyLimit = FREE_WEEKLY_LIMIT;
  if (!Number.isFinite(proWeeklyLimit)) proWeeklyLimit = PRO_WEEKLY_LIMIT;

  freeWeeklyLimit = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, freeWeeklyLimit));
  proWeeklyLimit = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, proWeeklyLimit));

  if (proWeeklyLimit < freeWeeklyLimit) {
    proWeeklyLimit = freeWeeklyLimit;
  }

  return { freeWeeklyLimit, proWeeklyLimit };
}
