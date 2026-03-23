import {
  FREE_WEEKLY_LIMIT,
  PRO_LICENSE_STATUS_CACHE_MS,
  PRO_WEEKLY_LIMIT,
} from '@/shared/config/productLimits';
import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { fetchWithAuth } from '@/shared/lib/api-auth';
import { isNumber, isString } from '@/shared/lib/type-guards';

export type ProLicenseStatus = {
  active: boolean;
  expiresAt: string | null;
  weeklyLimitFree: number;
  weeklyLimitPro: number;
};

export type AiWeeklyLimits = {
  freeWeeklyLimit: number;
  proWeeklyLimit: number;
};

export async function getAiWeeklyLimits(options?: {
  force?: boolean;
}): Promise<AiWeeklyLimits | null> {
  const status = await fetchProLicenseStatus({ force: options?.force === true });

  if (!status) {
    return null;
  }

  return {
    freeWeeklyLimit: status.weeklyLimitFree,
    proWeeklyLimit: status.weeklyLimitPro,
  };
}

type ProLicenseStatusCacheEntry = {
  data: ProLicenseStatus;
  expiresAt: number;
};

let proLicenseStatusCache: ProLicenseStatusCacheEntry | null = null;
let proLicenseStatusInFlight: Promise<ProLicenseStatus | null> | null = null;

export function invalidateProLicenseStatusCache(): void {
  proLicenseStatusCache = null;
}

export type FetchProLicenseStatusOptions = {
  force?: boolean;
};

async function fetchProLicenseStatusFromNetwork(): Promise<ProLicenseStatus | null> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/pro-license/status`, {
      method: 'GET',
    });
    if (!response.ok) {
      return null;
    }
    const raw = (await response.json()) as Record<string, unknown>;
    const active = Boolean(raw.active);
    const expiresAt = isString(raw.expiresAt) && raw.expiresAt.trim() ? raw.expiresAt.trim() : null;
    const weeklyLimitFree =
      isNumber(raw.weeklyLimitFree) && raw.weeklyLimitFree > 0
        ? raw.weeklyLimitFree
        : FREE_WEEKLY_LIMIT;
    const weeklyLimitPro =
      isNumber(raw.weeklyLimitPro) && raw.weeklyLimitPro > 0
        ? raw.weeklyLimitPro
        : PRO_WEEKLY_LIMIT;
    return { active, expiresAt, weeklyLimitFree, weeklyLimitPro };
  } catch {
    return null;
  }
}

export async function fetchProLicenseStatus(
  options?: FetchProLicenseStatusOptions,
): Promise<ProLicenseStatus | null> {
  const force = options?.force === true;
  const now = Date.now();

  if (!force && proLicenseStatusCache && now < proLicenseStatusCache.expiresAt) {
    return proLicenseStatusCache.data;
  }

  let joinedInFlight = false;
  while (proLicenseStatusInFlight) {
    joinedInFlight = true;
    await proLicenseStatusInFlight;
  }

  if (!force && proLicenseStatusCache && Date.now() < proLicenseStatusCache.expiresAt) {
    return proLicenseStatusCache.data;
  }

  if (
    force &&
    joinedInFlight &&
    proLicenseStatusCache &&
    Date.now() < proLicenseStatusCache.expiresAt
  ) {
    return proLicenseStatusCache.data;
  }

  if (force) {
    invalidateProLicenseStatusCache();
  }

  proLicenseStatusInFlight = (async () => {
    const result = await fetchProLicenseStatusFromNetwork();
    if (result) {
      proLicenseStatusCache = {
        data: result,
        expiresAt: Date.now() + PRO_LICENSE_STATUS_CACHE_MS,
      };
    }
    return result;
  })();

  try {
    return await proLicenseStatusInFlight;
  } finally {
    proLicenseStatusInFlight = null;
  }
}

export type ProLicenseRedeemErrorCode =
  | 'invalid_key'
  | 'used_elsewhere'
  | 'server_error'
  | 'rate_limit'
  | 'activation_failed'
  | 'invalid_response'
  | 'network';

export type RedeemProLicenseResult =
  | { ok: true; expiresAt: string }
  | { ok: false; error: string; code?: ProLicenseRedeemErrorCode; status?: number };

function parseRedeemErrorCode(raw: unknown): ProLicenseRedeemErrorCode | undefined {
  if (
    raw === 'invalid_key' ||
    raw === 'used_elsewhere' ||
    raw === 'server_error' ||
    raw === 'rate_limit'
  ) {
    return raw;
  }
  return undefined;
}

export async function redeemProLicenseKey(key: string): Promise<RedeemProLicenseResult> {
  try {
    const response = await fetchWithAuth(`${getWebApiUrl()}/api/pro-license/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const raw = (await response.json()) as { error?: string; code?: unknown; expiresAt?: string };
    if (!response.ok) {
      const serverCode = parseRedeemErrorCode(raw.code);
      const code: ProLicenseRedeemErrorCode =
        serverCode ??
        (response.status === 429 ? 'rate_limit' : undefined) ??
        (response.status >= 500 ? 'server_error' : undefined) ??
        'activation_failed';
      return {
        ok: false,
        error: isString(raw.error) && raw.error.trim() ? raw.error : 'Activation failed',
        code,
        status: response.status,
      };
    }
    const expiresAt = isString(raw.expiresAt) && raw.expiresAt.trim() ? raw.expiresAt.trim() : '';
    if (!expiresAt) {
      return { ok: false, error: 'Invalid server response', code: 'invalid_response' };
    }
    invalidateProLicenseStatusCache();
    return { ok: true, expiresAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    return { ok: false, error: message, code: 'network' };
  }
}
