import {
  AI_BONUS_AMOUNT,
  AI_BONUS_COOLDOWN_KEY_PREFIX,
  AI_BONUS_COOLDOWN_SECONDS,
} from '@/config/constants';
import { prisma } from '@/lib/prisma';

export const BONUS_APP_CONFIG_KEYS = {
  AI_BONUS_AMOUNT: 'AI_BONUS_AMOUNT',
  AI_BONUS_COOLDOWN_SECONDS: 'AI_BONUS_COOLDOWN_SECONDS',
  AI_BONUS_COOLDOWN_KEY_PREFIX: 'AI_BONUS_COOLDOWN_KEY_PREFIX',
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
