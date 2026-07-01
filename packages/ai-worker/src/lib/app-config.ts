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

const ALL_MANAGED_KEYS = [
  ...Object.values(BONUS_APP_CONFIG_KEYS),
  ...Object.values(WEEKLY_LIMIT_APP_CONFIG_KEYS),
] as const;

const DEFAULTS: Record<(typeof ALL_MANAGED_KEYS)[number], string> = {
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_AMOUNT]: String(AI_BONUS_AMOUNT),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS]: String(AI_BONUS_COOLDOWN_SECONDS),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX]: AI_BONUS_COOLDOWN_KEY_PREFIX,
  [WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_FREE]: String(FREE_WEEKLY_LIMIT),
  [WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_PRO]: String(PRO_WEEKLY_LIMIT),
};

/** In-process cache TTL for hot-path AppConfig reads (AI routes). */
const APP_CONFIG_CACHE_TTL_MS = 60_000;

let cachedValues: Map<string, string> | null = null;
let cachedAt = 0;
let loadInFlight: Promise<Map<string, string>> | null = null;

/** Call after admin updates AppConfig so AI limits refresh without waiting for TTL. */
export function invalidateAppConfigCache(): void {
  cachedValues = null;
  cachedAt = 0;
  loadInFlight = null;
}

function defaultValuesMap(): Map<string, string> {
  return new Map(ALL_MANAGED_KEYS.map((key) => [key, DEFAULTS[key]]));
}

async function loadManagedAppConfigValues(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cachedValues && now - cachedAt < APP_CONFIG_CACHE_TTL_MS) {
    return cachedValues;
  }

  if (loadInFlight) {
    return loadInFlight;
  }

  loadInFlight = (async () => {
    const map = defaultValuesMap();

    if (process.env.DATABASE_URL?.trim()) {
      try {
        const rows = await prisma.appConfig.findMany({
          where: { key: { in: [...ALL_MANAGED_KEYS] } },
          select: { key: true, value: true },
        });
        for (const row of rows) {
          const value = row.value?.trim();
          if (value) {
            map.set(row.key, value);
          }
        }
      } catch (e) {
        console.error('[app-config] load failed', e);
      }
    }

    cachedValues = map;
    cachedAt = Date.now();
    return map;
  })();

  try {
    return await loadInFlight;
  } finally {
    loadInFlight = null;
  }
}

function readConfigValue(map: Map<string, string>, key: string, fallback: string): string {
  return map.get(key)?.trim() || fallback;
}

export type BonusConfig = {
  amount: number;
  cooldownSeconds: number;
  cooldownKeyPrefix: string;
};

export async function getBonusConfig(): Promise<BonusConfig> {
  const map = await loadManagedAppConfigValues();
  const amountStr = readConfigValue(map, CONFIG_KEYS.AI_BONUS_AMOUNT, String(AI_BONUS_AMOUNT));
  const cooldownStr = readConfigValue(
    map,
    CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS,
    String(AI_BONUS_COOLDOWN_SECONDS),
  );
  const prefix = readConfigValue(
    map,
    CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX,
    AI_BONUS_COOLDOWN_KEY_PREFIX,
  );

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
  const map = await loadManagedAppConfigValues();
  const freeStr = readConfigValue(
    map,
    WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_FREE,
    String(FREE_WEEKLY_LIMIT),
  );
  const proStr = readConfigValue(
    map,
    WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_PRO,
    String(PRO_WEEKLY_LIMIT),
  );

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
