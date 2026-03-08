import { Redis } from '@upstash/redis';
import type { Message } from '@/types';
import { memoryStore } from '@/lib/memory-store';

type KvClient = {
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
  get(key: string): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
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
      async get(key) {
        return redisClient!.get<string>(key);
      },
      async incr(key) {
        return redisClient!.incr(key);
      },
      async expire(key, seconds) {
        await redisClient!.expire(key, seconds);
      },
    };

const MESSAGE_TTL_SECONDS = 3600;
const MESSAGE_KEY_PREFIX = 'msg:';

export function getMessageKey(id: string): string {
  return `${MESSAGE_KEY_PREFIX}${id}`;
}

export async function saveMessage(id: string, data: Message): Promise<void> {
  await kv.set(getMessageKey(id), JSON.stringify(data), {
    ex: MESSAGE_TTL_SECONDS,
  });
}

export async function getMessage(id: string): Promise<Message | null> {
  const raw = await kv.get(getMessageKey(id));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Message;
  } catch {
    return null;
  }
}

export const redis = kv;
