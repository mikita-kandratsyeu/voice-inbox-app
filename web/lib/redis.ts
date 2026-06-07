import { Redis } from '@upstash/redis';
import type { Message } from '@/types';
import {
  GET_RETRY_ATTEMPTS,
  GET_RETRY_DELAY_MS,
  MESSAGE_KEY_PREFIX,
  MESSAGE_TTL_SECONDS,
} from '@/config/constants';
import { memoryStore } from '@/lib/memory-store';

type KvClient = {
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
  setIfNotExists(key: string, value: string, options?: { ex?: number }): Promise<boolean>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  incrWithExpireOnFirst(key: string, seconds: number): Promise<number>;
  incrByWithExpireOnFirst(key: string, amount: number, seconds: number): Promise<number>;
  decr(key: string): Promise<number>;
  decrBy(key: string, amount: number): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<void>;
};

const useMemoryStore = !process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN;

const redisClient = useMemoryStore
  ? null
  : new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

const kv: KvClient = useMemoryStore
  ? memoryStore
  : {
      async set(key, value, options) {
        await redisClient!.set(key, value, options?.ex ? { ex: options.ex } : undefined);
      },
      async setIfNotExists(key, value, options) {
        const result = await redisClient!.set(
          key,
          value,
          options?.ex ? { nx: true, ex: options.ex } : { nx: true },
        );
        return result === 'OK';
      },
      async get(key) {
        return redisClient!.get<string>(key);
      },
      async incr(key) {
        return redisClient!.incr(key);
      },
      async incrWithExpireOnFirst(key, seconds) {
        return redisClient!.eval<[string], number>(
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
        return redisClient!.eval<[string], number>(
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
      async decr(key) {
        return redisClient!.decr(key);
      },
      async decrBy(key, amount) {
        return redisClient!.eval<[string], number>(
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
      async expire(key, seconds) {
        await redisClient!.expire(key, seconds);
      },
      async del(key) {
        await redisClient!.del(key);
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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getMessage(id: string, syncToken?: string): Promise<Message | null> {
  const key = getMessageKey(id);

  const doGet = async (): Promise<string | object | null> => {
    if (useMemoryStore) {
      return kv.get(key);
    }
    if (syncToken && redisClient) {
      const clientWithToken = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      });
      clientWithToken.readYourWritesSyncToken = syncToken;
      return clientWithToken.get<string>(key);
    }
    return kv.get(key);
  };

  let raw: string | object | null = null;

  if (!useMemoryStore && !syncToken) {
    for (let attempt = 0; attempt < GET_RETRY_ATTEMPTS; attempt++) {
      raw = await doGet();
      if (raw) break;
      if (attempt < GET_RETRY_ATTEMPTS - 1) {
        await sleep(GET_RETRY_DELAY_MS * (attempt + 1));
      }
    }
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
  if (!useMemoryStore && redisClient) {
    return redisClient.readYourWritesSyncToken || undefined;
  }
  return undefined;
}

export async function listKeysByPrefix(prefix: string): Promise<string[]> {
  if (redisClient) {
    const pattern = `${prefix}*`;
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [next, batch] = await redisClient.scan(cursor, { match: pattern, count: 100 });
      cursor = typeof next === 'string' ? parseInt(next, 10) : next;
      keys.push(...(batch ?? []));
    } while (cursor !== 0);
    return keys;
  }
  return memoryStore.listKeys(prefix);
}

export const redis = kv;
