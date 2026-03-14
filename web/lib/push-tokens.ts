import { PUSH_TOKEN_KEY_PREFIX, PUSH_TOKEN_TTL_SECONDS } from '@/config/constants';
import { redis } from '@/lib/redis';

function getPushTokenKey(deviceId: string): string {
  return `${PUSH_TOKEN_KEY_PREFIX}${deviceId}`;
}

export async function savePushToken(deviceId: string, deviceToken: string): Promise<void> {
  const key = getPushTokenKey(deviceId);
  await redis.set(key, deviceToken, { ex: PUSH_TOKEN_TTL_SECONDS });
}

export async function getPushToken(deviceId: string): Promise<string | null> {
  const key = getPushTokenKey(deviceId);
  const value = await redis.get(key);
  return typeof value === 'string' ? value : null;
}
