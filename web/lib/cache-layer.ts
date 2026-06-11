/**
 * Cache layer with stale-while-revalidate support.
 * Provides intelligent caching for frequently accessed data.
 */

import { redis } from '@/lib/redis';

export interface CacheStrategy {
  ttl: number;
  staleWhileRevalidate?: number;
  tags?: string[];
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  tags?: string[];
}

export class CacheLayer {
  private revalidationQueue = new Map<string, Promise<void>>();

  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    strategy: CacheStrategy,
  ): Promise<T> {
    try {
      const cached = await redis.get(key);

      if (cached) {
        const parsed = JSON.parse(cached) as CachedData<T>;
        const age = Date.now() - parsed.timestamp;

        if (age < strategy.ttl * 1000) {
          return parsed.data;
        }

        if (
          strategy.staleWhileRevalidate &&
          age < (strategy.ttl + strategy.staleWhileRevalidate) * 1000
        ) {
          void this.revalidate(key, fetcher, strategy);
          return parsed.data;
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    const fresh = await fetcher();
    await this.set(key, fresh, strategy);
    return fresh;
  }

  async set<T>(key: string, value: T, strategy: CacheStrategy): Promise<void> {
    try {
      const data: CachedData<T> = {
        data: value,
        timestamp: Date.now(),
        tags: strategy.tags,
      };

      await redis.set(key, JSON.stringify(data), {
        ex: strategy.ttl + (strategy.staleWhileRevalidate || 0),
      });

      if (strategy.tags?.length) {
        await this.indexByTags(key, strategy.tags);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async deleteByTag(tag: string): Promise<void> {
    try {
      const tagKey = `cache:tag:${tag}`;
      const keys = await this.getKeysByTag(tagKey);

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => redis.del(key)));
        await redis.del(tagKey);
      }
    } catch (error) {
      console.error('Cache delete by tag error:', error);
    }
  }

  async deleteManyByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map((tag) => this.deleteByTag(tag)));
  }

  private async revalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    strategy: CacheStrategy,
  ): Promise<void> {
    const existingRevalidation = this.revalidationQueue.get(key);
    if (existingRevalidation) {
      return existingRevalidation;
    }

    const revalidationPromise = (async () => {
      try {
        const fresh = await fetcher();
        await this.set(key, fresh, strategy);
      } catch (error) {
        console.error('Cache revalidation failed:', key, error);
      } finally {
        this.revalidationQueue.delete(key);
      }
    })();

    this.revalidationQueue.set(key, revalidationPromise);
    return revalidationPromise;
  }

  private async indexByTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = `cache:tag:${tag}`;
      try {
        const existing = await redis.get(tagKey);
        const keys = existing ? JSON.parse(existing) : [];
        if (!keys.includes(key)) {
          keys.push(key);
          await redis.set(tagKey, JSON.stringify(keys), { ex: 86400 });
        }
      } catch (error) {
        console.error('Cache tag indexing error:', error);
      }
    }
  }

  private async getKeysByTag(tagKey: string): Promise<string[]> {
    try {
      const raw = await redis.get(tagKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export const cache = new CacheLayer();

export const CACHE_STRATEGIES = {
  SHORT: { ttl: 60, staleWhileRevalidate: 30 } as CacheStrategy,
  MEDIUM: { ttl: 300, staleWhileRevalidate: 60 } as CacheStrategy,
  LONG: { ttl: 3600, staleWhileRevalidate: 300 } as CacheStrategy,
  APP_CONFIG: { ttl: 600, staleWhileRevalidate: 120, tags: ['app-config'] } as CacheStrategy,
  USER_DATA: (deviceId: string) =>
    ({
      ttl: 300,
      staleWhileRevalidate: 60,
      tags: [`user:${deviceId}`],
    }) as CacheStrategy,
  AI_MODEL_MANIFEST: {
    ttl: 1800,
    staleWhileRevalidate: 300,
    tags: ['ai-models'],
  } as CacheStrategy,
} as const;
