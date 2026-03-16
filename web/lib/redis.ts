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
  decr(key: string): Promise<number>;
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
      async decr(key) {
        return redisClient!.decr(key);
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

export async function saveMessage(id: string, data: Message): Promise<void> {
  await kv.set(getMessageKey(id), JSON.stringify(data), {
    ex: MESSAGE_TTL_SECONDS,
  });
}

export async function saveMessageIfNotExists(id: string, data: Message): Promise<boolean> {
  return kv.setIfNotExists(getMessageKey(id), JSON.stringify(data), {
    ex: MESSAGE_TTL_SECONDS,
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
