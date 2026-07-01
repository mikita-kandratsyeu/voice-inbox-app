import type { Message } from '@/types';
import {
  GET_RETRY_ATTEMPTS,
  GET_RETRY_DELAY_MS,
  MESSAGE_KEY_PREFIX,
  MESSAGE_TTL_SECONDS,
} from '@/config/constants';
import { memoryStore } from '@/lib/memory-store';
import { redisPool, executeWithRetry } from '@/lib/redis-pool';

type KvClient = {
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
  setIfNotExists(key: string, value: string, options?: { ex?: number }): Promise<boolean>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  incrWithExpireOnFirst(key: string, seconds: number): Promise<number>;
  incrByWithExpireOnFirst(key: string, amount: number, seconds: number): Promise<number>;
  incrementWithinLimit(
    key: string,
    amount: number,
    limit: number,
    seconds: number,
  ): Promise<{ allowed: boolean; value: number }>;
  decr(key: string): Promise<number>;
  decrBy(key: string, amount: number): Promise<number>;
  decrByWithFloor(key: string, amount: number): Promise<{ value: number; delta: number }>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
};

const useMemoryStore = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;

const kv: KvClient = useMemoryStore
  ? memoryStore
  : {
      async set(key, value, options) {
        const client = redisPool.getClient();
        await client.set(key, value, options?.ex ? { ex: options.ex } : undefined);
      },
      async setIfNotExists(key, value, options) {
        const client = redisPool.getClient();
        const result = await client.set(
          key,
          value,
          options?.ex ? { nx: true, ex: options.ex } : { nx: true },
        );
        return result === 'OK';
      },
      async get(key) {
        const client = redisPool.getClient();
        return client.get<string>(key);
      },
      async incr(key) {
        const client = redisPool.getClient();
        return client.incr(key);
      },
      async incrWithExpireOnFirst(key, seconds) {
        const client = redisPool.getClient();
        return client.eval<[string], number>(
          `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
`,
          [key],
          [String(seconds)],
        );
      },
      async incrByWithExpireOnFirst(key, amount, seconds) {
        const client = redisPool.getClient();
        return client.eval<[string], number>(
          `
local separator = string.find(ARGV[1], ":")
local amount = tonumber(string.sub(ARGV[1], 1, separator - 1))
local seconds = tonumber(string.sub(ARGV[1], separator + 1))
local previous = tonumber(redis.call("GET", KEYS[1]) or "0")
local count = redis.call("INCRBY", KEYS[1], amount)
if previous == 0 then
  redis.call("EXPIRE", KEYS[1], seconds)
end
return count
`,
          [key],
          [`${amount}:${seconds}`],
        );
      },
      async incrementWithinLimit(key, amount, limit, seconds) {
        const client = redisPool.getClient();
        const raw = await client.eval<[string], string>(
          `
local first = string.find(ARGV[1], ":")
local second = string.find(ARGV[1], ":", first + 1)
local amount = tonumber(string.sub(ARGV[1], 1, first - 1))
local limit = tonumber(string.sub(ARGV[1], first + 1, second - 1))
local seconds = tonumber(string.sub(ARGV[1], second + 1))
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
if current + amount > limit then
  return tostring(current) .. ":0"
end
local count = redis.call("INCRBY", KEYS[1], amount)
if current == 0 then
  redis.call("EXPIRE", KEYS[1], seconds)
end
return tostring(count) .. ":1"
`,
          [key],
          [`${amount}:${limit}:${seconds}`],
        );
        const [valueRaw, allowedRaw] = raw.split(':');
        const value = Number.parseInt(valueRaw ?? '0', 10);
        return {
          allowed: allowedRaw === '1',
          value: Number.isFinite(value) ? value : 0,
        };
      },
      async decr(key) {
        const client = redisPool.getClient();
        return client.decr(key);
      },
      async decrBy(key, amount) {
        const client = redisPool.getClient();
        return client.eval<[string], number>(
          `
if redis.call("EXISTS", KEYS[1]) == 0 then
  return 0
end
local ttl = redis.call("TTL", KEYS[1])
local count = redis.call("DECRBY", KEYS[1], ARGV[1])
if count < 0 then
  redis.call("SET", KEYS[1], "0")
  if ttl > 0 then
    redis.call("EXPIRE", KEYS[1], ttl)
  end
  return 0
end
return count
`,
          [key],
          [String(amount)],
        );
      },
      async decrByWithFloor(key, amount) {
        const client = redisPool.getClient();
        const raw = await client.eval<[string], string>(
          `
if redis.call("EXISTS", KEYS[1]) == 0 then
  return "0:0"
end
local ttl = redis.call("TTL", KEYS[1])
local previous = tonumber(redis.call("GET", KEYS[1]) or "0")
local count = redis.call("DECRBY", KEYS[1], ARGV[1])
if count < 0 then
  redis.call("SET", KEYS[1], "0")
  if ttl > 0 then
    redis.call("EXPIRE", KEYS[1], ttl)
  end
  return "0:" .. tostring(previous)
end
return tostring(count) .. ":" .. tostring(previous - count)
`,
          [key],
          [String(amount)],
        );
        const [valueRaw, deltaRaw] = raw.split(':');
        const value = Number.parseInt(valueRaw ?? '0', 10);
        const delta = Number.parseInt(deltaRaw ?? '0', 10);
        return {
          value: Number.isFinite(value) ? value : 0,
          delta: Number.isFinite(delta) ? delta : 0,
        };
      },
      async expire(key, seconds) {
        const client = redisPool.getClient();
        await client.expire(key, seconds);
      },
      async del(key) {
        const client = redisPool.getClient();
        await client.del(key);
      },
    };

export function getMessageKey(id: string): string {
  return `${MESSAGE_KEY_PREFIX}${id}`;
}

export async function saveMessage(
  id: string,
  data: Message,
  ttlSeconds: number = MESSAGE_TTL_SECONDS,
): Promise<void> {
  await kv.set(getMessageKey(id), JSON.stringify(data), {
    ex: ttlSeconds,
  });
}

export async function saveMessageIfNotExists(
  id: string,
  data: Message,
  ttlSeconds: number = MESSAGE_TTL_SECONDS,
): Promise<boolean> {
  return kv.setIfNotExists(getMessageKey(id), JSON.stringify(data), {
    ex: ttlSeconds,
  });
}

export async function getMessage(id: string, syncToken?: string): Promise<Message | null> {
  const key = getMessageKey(id);

  const doGet = async (): Promise<string | object | null> => {
    if (useMemoryStore) {
      return kv.get(key);
    }
    if (syncToken) {
      const clientWithToken = redisPool.getClientWithSyncToken(syncToken);
      return clientWithToken.get<string>(key);
    }
    return kv.get(key);
  };

  let raw: string | object | null = null;

  if (!useMemoryStore && !syncToken) {
    raw = await executeWithRetry(
      async () => {
        const result = await doGet();
        if (result === null) {
          return null;
        }
        return result;
      },
      GET_RETRY_ATTEMPTS,
      GET_RETRY_DELAY_MS,
    );
  } else {
    raw = await doGet();
  }

  if (!raw) {
    return null;
  }

  try {
    if (typeof raw === 'object' && raw !== null) {
      return raw as Message;
    }
    return JSON.parse(raw as string) as Message;
  } catch {
    return null;
  }
}

export function getSyncToken(): string | undefined {
  if (!useMemoryStore) {
    const client = redisPool.getClient();
    return client.readYourWritesSyncToken || undefined;
  }
  return undefined;
}

export async function listKeysByPrefix(prefix: string): Promise<string[]> {
  if (!useMemoryStore) {
    const client = redisPool.getClient();
    const pattern = `${prefix}*`;
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [next, batch] = await client.scan(cursor, { match: pattern, count: 100 });
      cursor = typeof next === 'string' ? parseInt(next, 10) : next;
      keys.push(...(batch ?? []));
    } while (cursor !== 0);
    return keys;
  }
  return memoryStore.listKeys(prefix);
}

export const redis = kv;
