import {
  APP_FOREGROUND_KEY_PREFIX,
  APP_FOREGROUND_TTL_SECONDS,
  LIMIT_PUSH_DEBOUNCE_KEY_PREFIX,
  LIMIT_PUSH_DEBOUNCE_SECONDS,
  PUSH_LOCK_KEY_PREFIX,
  PUSH_LOCK_TTL_SECONDS,
  PUSH_PENDING_KEY_PREFIX,
  PUSH_PENDING_TTL_SECONDS,
  PUSH_TOKEN_KEY_PREFIX,
  PUSH_TOKEN_TTL_SECONDS,
} from '@/config/constants';
import { isDevelopmentAppEnv } from '@/lib/app-env';
import { sendPushNotification } from '@/lib/push';
import { listKeysByPrefix, redis } from '@/lib/redis';

function getPushTokenKey(deviceId: string): string {
  return `${PUSH_TOKEN_KEY_PREFIX}${deviceId}`;
}

function getAppForegroundKey(deviceId: string): string {
  return `${APP_FOREGROUND_KEY_PREFIX}${deviceId}`;
}

export async function setAppForeground(deviceId: string): Promise<void> {
  const key = getAppForegroundKey(deviceId);
  await redis.set(key, '1', { ex: APP_FOREGROUND_TTL_SECONDS });
}

export async function clearAppForeground(deviceId: string): Promise<void> {
  const key = getAppForegroundKey(deviceId);
  await redis.del(key);
}

export async function isAppInForeground(deviceId: string): Promise<boolean> {
  const key = getAppForegroundKey(deviceId);
  const value = await redis.get(key);
  return value != null;
}

export type PushPlatform = 'ios' | 'android';

type StoredPushData = {
  token: string;
  locale?: string | null;
  platform?: PushPlatform | null;
  deviceModel?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
  osVersion?: string | null;
};

export type PushTokenMetadataPatch = {
  deviceModel?: string | null;
  appVersion?: string | null;
  buildNumber?: string | null;
  osVersion?: string | null;
};

async function parseStoredPushData(deviceId: string): Promise<StoredPushData | null> {
  const key = getPushTokenKey(deviceId);
  const value = await redis.get(key);
  if (value == null) return null;

  if (typeof value === 'object' && value !== null && 'token' in value) {
    return value as StoredPushData;
  }
  if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try {
        return JSON.parse(value) as StoredPushData;
      } catch {
        return { token: value };
      }
    }
    return { token: value };
  }
  return null;
}

export async function savePushToken(
  deviceId: string,
  deviceToken: string,
  locale?: string | null,
  platform?: PushPlatform | null,
  metaPatch?: PushTokenMetadataPatch,
): Promise<void> {
  const key = getPushTokenKey(deviceId);
  const existing = await parseStoredPushData(deviceId);

  const deviceModel =
    metaPatch && 'deviceModel' in metaPatch
      ? (metaPatch.deviceModel ?? null)
      : (existing?.deviceModel ?? null);
  const appVersion =
    metaPatch && 'appVersion' in metaPatch
      ? (metaPatch.appVersion ?? null)
      : (existing?.appVersion ?? null);
  const buildNumber =
    metaPatch && 'buildNumber' in metaPatch
      ? (metaPatch.buildNumber ?? null)
      : (existing?.buildNumber ?? null);
  const osVersion =
    metaPatch && 'osVersion' in metaPatch
      ? (metaPatch.osVersion ?? null)
      : (existing?.osVersion ?? null);

  const data: StoredPushData = {
    token: deviceToken,
    locale: locale ?? null,
    platform: platform ?? null,
    deviceModel: deviceModel ?? null,
    appVersion: appVersion ?? null,
    buildNumber: buildNumber ?? null,
    osVersion: osVersion ?? null,
  };
  await redis.set(key, JSON.stringify(data), { ex: PUSH_TOKEN_TTL_SECONDS });

  if (isDevelopmentAppEnv()) {
    console.log('[Push] savePushToken', {
      deviceId,
      key,
      locale: data.locale,
      platform: data.platform,
      deviceModel: data.deviceModel,
      appVersion: data.appVersion,
      buildNumber: data.buildNumber,
      osVersion: data.osVersion,
    });
  }
}

export async function getPushToken(deviceId: string): Promise<string | null> {
  const data = await getPushTokenWithLocale(deviceId);
  return data?.token ?? null;
}

function getPushPendingKey(deviceId: string): string {
  return `${PUSH_PENDING_KEY_PREFIX}${deviceId}`;
}

function getPushLockKey(deviceId: string): string {
  return `${PUSH_LOCK_KEY_PREFIX}${deviceId}`;
}

/**
 * Registers one more completed AI task for this device.
 * Returns true if this caller is the "leader" responsible for sending the push
 * (acquired the debounce lock), false if another task already holds the lock.
 *
 * Pattern: leader waits for the debounce window, then reads+clears the counter
 * and sends a single batched push. Non-leaders just increment and exit.
 */
export async function registerAiCompletion(deviceId: string): Promise<boolean> {
  const countKey = getPushPendingKey(deviceId);
  const lockKey = getPushLockKey(deviceId);

  await redis.incr(countKey);
  await redis.expire(countKey, PUSH_PENDING_TTL_SECONDS);

  const isLeader = await redis.setIfNotExists(lockKey, '1', { ex: PUSH_LOCK_TTL_SECONDS });
  return isLeader;
}

/**
 * Called by the leader after the debounce window.
 * Reads and clears the pending counter, releases the lock.
 * Returns the number of completions to include in the push.
 */
export async function collectPendingAndUnlock(deviceId: string): Promise<number> {
  const countKey = getPushPendingKey(deviceId);
  const lockKey = getPushLockKey(deviceId);

  const value = await redis.get(countKey);
  const count = value ? parseInt(String(value), 10) || 0 : 0;

  await redis.del(countKey);
  await redis.del(lockKey);

  return count;
}

export async function getAllDeviceIdsWithPushTokens(): Promise<string[]> {
  const keys = await listKeysByPrefix(PUSH_TOKEN_KEY_PREFIX);
  return keys.map((key) => key.slice(PUSH_TOKEN_KEY_PREFIX.length));
}

export async function getPushTokenWithLocale(deviceId: string): Promise<{
  token: string;
  locale: string | null;
  platform: PushPlatform | null;
  deviceModel: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  osVersion: string | null;
} | null> {
  const key = getPushTokenKey(deviceId);
  const value = await redis.get(key);

  if (isDevelopmentAppEnv()) {
    console.log('[Push] getPushTokenWithLocale', {
      deviceId,
      key,
      hasValue: value != null,
      valueType: typeof value,
      valueLength: value != null ? String(value).length : 0,
    });
  }

  if (value == null) return null;

  let data: StoredPushData | null = null;
  if (typeof value === 'object' && value !== null && 'token' in value) {
    data = value as StoredPushData;
  } else if (typeof value === 'string') {
    if (value.startsWith('{')) {
      try {
        data = JSON.parse(value) as StoredPushData;
      } catch {
        return {
          token: value,
          locale: null,
          platform: null,
          deviceModel: null,
          appVersion: null,
          buildNumber: null,
          osVersion: null,
        };
      }
    } else {
      return {
        token: value,
        locale: null,
        platform: null,
        deviceModel: null,
        appVersion: null,
        buildNumber: null,
        osVersion: null,
      };
    }
  }

  return data?.token
    ? {
        token: data.token,
        locale: data.locale ?? null,
        platform: data.platform ?? null,
        deviceModel: data.deviceModel ?? null,
        appVersion: data.appVersion ?? null,
        buildNumber: data.buildNumber ?? null,
        osVersion: data.osVersion ?? null,
      }
    : null;
}

/**
 * Remove push token for a device (e.g., when FCM returns invalid token error).
 * This prevents repeated failed send attempts.
 */
export async function cleanupInvalidPushToken(deviceId: string): Promise<void> {
  const key = getPushTokenKey(deviceId);
  await redis.del(key);
  console.log('[Push] cleaned up invalid token', { deviceId, key });
}

export async function sendLimitExceededPush(deviceId: string): Promise<void> {
  const debounceKey = `${LIMIT_PUSH_DEBOUNCE_KEY_PREFIX}${deviceId}`;
  const acquired = await redis.setIfNotExists(debounceKey, '1', {
    ex: LIMIT_PUSH_DEBOUNCE_SECONDS,
  });
  if (!acquired) {
    if (isDevelopmentAppEnv()) {
      console.log('[Push] limit exceeded: skip (debounced)', { deviceId });
    }
    return;
  }

  const data = await getPushTokenWithLocale(deviceId);
  if (!data) {
    if (isDevelopmentAppEnv()) {
      console.log('[Push] limit exceeded: no token', { deviceId });
    }
    return;
  }

  const sent = await sendPushNotification(
    data.token,
    { type: 'limit_exceeded' },
    data.locale,
    undefined,
    deviceId,
  );
  console.log('[Push] limit exceeded:', sent ? 'sent' : 'failed', { deviceId });
}
