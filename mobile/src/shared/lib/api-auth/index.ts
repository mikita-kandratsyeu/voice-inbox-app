import { getWebApiUrl } from '@/shared/config/runtimeConfig';
import { getFirebaseAppCheckToken } from '@/shared/lib/app-check/appCheckToken';
import { HEADER_FIREBASE_APP_CHECK } from '@/shared/lib/app-check/constants';
import { shouldSkipFirebaseAppCheck } from '@/shared/lib/app-check/shouldSkipAppCheck';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { nitroFetch, type NitroFetchInit } from '@/shared/lib/fetch';
import { isTransientNetworkError } from '@/shared/lib/fetch/isTransientNetworkError';

import { isNumber, isString } from '../type-guards';
import {
  TOKEN_FETCH_MAX_ATTEMPTS,
  TOKEN_FETCH_RETRY_BASE_DELAY_MS,
  WEB_API_FETCH_TIMEOUT_MS,
  WEB_API_TOKEN_FETCH_TIMEOUT_MS,
} from './constants';

function getTokenUrl(): string {
  const base = getWebApiUrl().replace(/\/$/, '');
  return `${base}/api/token`;
}
const EXPIRY_BUFFER_MS = 60 * 1000;

let cachedToken: string | null = null;
let cachedExpiresAt = 0;
let cachedDeviceId: string | null = null;

let tokenFetchInFlight: Promise<{ token: string; deviceId: string }> | null = null;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function clearApiToken(): void {
  cachedToken = null;
  cachedExpiresAt = 0;
  cachedDeviceId = null;
  tokenFetchInFlight = null;
}

async function exchangeTokenOnce(
  deviceId: string,
  appCheckToken: string | null,
): Promise<{ token: string; deviceId: string }> {
  const response = await nitroFetch(getTokenUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(appCheckToken ? { [HEADER_FIREBASE_APP_CHECK]: appCheckToken } : {}),
      'x-device-id': deviceId,
    },
    timeoutMs: WEB_API_TOKEN_FETCH_TIMEOUT_MS,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Token request failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  const access_token = data.access_token;
  const expires_in = isNumber(data.expires_in) ? data.expires_in : 12 * 3600;

  if (!access_token || !isString(access_token)) {
    throw new Error('Invalid token response');
  }

  cachedToken = access_token;
  cachedExpiresAt = Date.now() + expires_in * 1000;
  cachedDeviceId = deviceId;
  return { token: access_token, deviceId };
}

async function fetchToken(): Promise<{ token: string; deviceId: string }> {
  const deviceId = await getOrCreateDeviceId();
  const skipAppCheck = shouldSkipFirebaseAppCheck();
  const appCheckToken = skipAppCheck ? null : await getFirebaseAppCheckToken();

  let lastError: unknown;
  for (let attempt = 0; attempt < TOKEN_FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      return await exchangeTokenOnce(deviceId, appCheckToken);
    } catch (err) {
      lastError = err;
      const hasRetriesLeft = attempt < TOKEN_FETCH_MAX_ATTEMPTS - 1;
      if (!hasRetriesLeft || !isTransientNetworkError(err)) {
        throw err;
      }
      await sleepMs(TOKEN_FETCH_RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function getTokenAndDeviceId(): Promise<{ token: string; deviceId: string }> {
  if (cachedToken && cachedDeviceId && Date.now() < cachedExpiresAt - EXPIRY_BUFFER_MS) {
    return { token: cachedToken, deviceId: cachedDeviceId };
  }

  if (tokenFetchInFlight) {
    return tokenFetchInFlight;
  }

  tokenFetchInFlight = fetchToken().finally(() => {
    tokenFetchInFlight = null;
  });

  return tokenFetchInFlight;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { token, deviceId } = await getTokenAndDeviceId();
  return {
    Authorization: `Bearer ${token}`,
    'x-device-id': deviceId,
  };
}

function mergeHeaders(
  base: RequestInit['headers'],
  extra: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (base) {
    const h = base instanceof Headers ? base : new Headers(base);
    h.forEach((value, key) => {
      out[key] = value;
    });
  }
  for (const [key, value] of Object.entries(extra)) {
    out[key] = value;
  }
  return out;
}

export type FetchWithAuthOptions = RequestInit & {
  skipRetry?: boolean;
  timeoutMs?: NitroFetchInit['timeoutMs'];
};

export async function fetchWithAuth(
  url: string,
  options: FetchWithAuthOptions = {},
): Promise<Response> {
  const { skipRetry, timeoutMs, ...fetchOptions } = options;
  const auth = await getAuthHeaders();
  const headers = mergeHeaders(fetchOptions.headers, auth);
  const nitroInit = {
    ...fetchOptions,
    headers,
    timeoutMs: timeoutMs ?? WEB_API_FETCH_TIMEOUT_MS,
  };

  let response = await nitroFetch(url, nitroInit);

  if (response.status === 401 && !skipRetry) {
    clearApiToken();
    const auth2 = await getAuthHeaders();
    const retryHeaders = mergeHeaders(fetchOptions.headers, auth2);
    response = await nitroFetch(url, { ...nitroInit, headers: retryHeaders });
  }

  return response;
}
