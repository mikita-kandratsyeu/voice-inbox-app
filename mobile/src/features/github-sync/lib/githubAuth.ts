import { openInAppBrowser } from '@/features/in-app-browser';
import { getGithubOAuthClientId as getGithubOAuthClientIdFromConfig } from '@/shared/config/runtimeConfig';
import { nitroFetch } from '@/shared/lib/fetch';
import { isRecord, isString } from '@/shared/lib/type-guards';

import { GITHUB_ACCESS_TOKEN_URL, GITHUB_DEVICE_CODE_URL, GITHUB_OAUTH_SCOPE } from './constants';
import { setGithubSyncAccessToken } from './githubSecrets';

const POLL_TIMEOUT_MS = 10 * 60 * 1_000;
const DEVICE_FLOW_CANCELLED = 'device_flow_cancelled';

let activeDeviceFlowAbort: AbortController | null = null;

export function cancelGithubDeviceFlow(): void {
  activeDeviceFlowAbort?.abort();
  activeDeviceFlowAbort = null;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error(DEVICE_FLOW_CANCELLED);
  }
}

function sleepMs(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error(DEVICE_FLOW_CANCELLED));
    };

    signal?.addEventListener('abort', onAbort);
  });
}

type DeviceCodeResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

type AccessTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

export function getGithubOAuthClientId(): string {
  return getGithubOAuthClientIdFromConfig();
}

export function isGithubOAuthConfigured(): boolean {
  return getGithubOAuthClientId().length > 0;
}

function parseDeviceCodeResponse(data: unknown): DeviceCodeResponse | null {
  if (!isRecord(data)) return null;
  const device_code = data.device_code;
  const user_code = data.user_code;
  const verification_uri = data.verification_uri;
  if (!isString(device_code) || !isString(user_code) || !isString(verification_uri)) {
    return null;
  }
  const expires_in = typeof data.expires_in === 'number' ? data.expires_in : 900;
  const interval = typeof data.interval === 'number' ? data.interval : 5;
  return { device_code, user_code, verification_uri, expires_in, interval };
}

function parseAccessTokenResponse(data: unknown): AccessTokenResponse | null {
  if (!isRecord(data)) return null;
  return {
    access_token: isString(data.access_token) ? data.access_token : undefined,
    error: isString(data.error) ? data.error : undefined,
    error_description: isString(data.error_description) ? data.error_description : undefined,
  };
}

async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
  const response = await nitroFetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: GITHUB_OAUTH_SCOPE,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Device code request failed: ${response.status}`);
  }

  const parsed = parseDeviceCodeResponse(await response.json());
  if (!parsed) {
    throw new Error('Invalid device code response');
  }
  return parsed;
}

async function pollAccessToken(
  clientId: string,
  deviceCode: string,
  intervalSec: number,
  expiresInSec: number,
  signal?: AbortSignal,
): Promise<string> {
  const started = Date.now();
  const deadline = started + Math.min(expiresInSec * 1_000, POLL_TIMEOUT_MS);
  const intervalMs = Math.max(intervalSec, 4) * 1_000;

  while (Date.now() < deadline) {
    throwIfAborted(signal);
    await sleepMs(intervalMs, signal);

    const response = await nitroFetch(GITHUB_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = parseAccessTokenResponse(await response.json());
    if (!data) {
      throw new Error('Invalid access token response');
    }

    if (data.access_token) {
      return data.access_token;
    }

    if (data.error === 'authorization_pending') {
      continue;
    }
    if (data.error === 'slow_down') {
      await sleepMs(intervalMs, signal);
      continue;
    }
    if (data.error === 'access_denied') {
      throw new Error('access_denied');
    }
    if (data.error === 'expired_token') {
      throw new Error('expired_token');
    }

    throw new Error(data.error_description || data.error || 'oauth_failed');
  }

  throw new Error('expired_token');
}

export type GithubDeviceFlowResult = {
  userCode: string;
  verificationUri: string;
};

export async function startGithubDeviceFlow(): Promise<GithubDeviceFlowResult> {
  const clientId = getGithubOAuthClientId();
  if (!clientId) {
    throw new Error('github_oauth_not_configured');
  }

  cancelGithubDeviceFlow();
  const abort = new AbortController();
  activeDeviceFlowAbort = abort;

  try {
    const device = await requestDeviceCode(clientId);
    throwIfAborted(abort.signal);
    void openInAppBrowser(device.verification_uri);

    const accessToken = await pollAccessToken(
      clientId,
      device.device_code,
      device.interval,
      device.expires_in,
      abort.signal,
    );

    await setGithubSyncAccessToken(accessToken);

    return {
      userCode: device.user_code,
      verificationUri: device.verification_uri,
    };
  } finally {
    if (activeDeviceFlowAbort === abort) {
      activeDeviceFlowAbort = null;
    }
  }
}

export async function revokeGithubConnection(): Promise<void> {
  // Token revocation optional; clearing local secrets is enough for disconnect.
}
