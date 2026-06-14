import { createHash } from 'react-native-quick-crypto';

/**
 * Prompt cache entry with hash-based lookup for system prompts.
 * Stores prompt text and context metadata for reuse.
 */
type PromptCacheEntry = {
  hash: string;
  promptText: string;
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
};

const promptCache = new Map<string, PromptCacheEntry>();

/** Cache expiry: 10 minutes (system prompts rarely change during session) */
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Max cache size: 20 entries (enough for all task types + variations) */
const MAX_CACHE_SIZE = 20;

/**
 * Computes SHA-256 hash of prompt text for cache key.
 * Fast hashing for collision-free lookup.
 */
function hashPrompt(text: string): string {
  const hash = createHash('sha256');
  hash.update(text, 'utf8');
  return hash.digest('hex');
}

/**
 * Checks if a prompt is cached and still valid.
 * Returns cache hit info for logging/monitoring.
 *
 * @param promptText - The prompt to check
 * @returns Cache hit info or null if miss/expired
 */
export function checkPromptCache(promptText: string): {
  hash: string;
  age: number;
  hitCount: number;
} | null {
  const hash = hashPrompt(promptText);
  const entry = promptCache.get(hash);

  if (!entry) {
    return null;
  }

  const now = Date.now();
  if (now > entry.expiresAt) {
    // Expired, remove from cache
    promptCache.delete(hash);
    return null;
  }

  // Cache hit
  entry.hitCount++;
  const age = now - entry.cachedAt;

  return { hash, age, hitCount: entry.hitCount };
}

/**
 * Adds a prompt to the cache with TTL.
 * Evicts oldest entry if cache is full (LRU-like).
 *
 * @param promptText - The prompt to cache
 * @returns Hash of cached prompt
 */
export function cachePrompt(promptText: string): string {
  const hash = hashPrompt(promptText);
  const now = Date.now();

  // Evict expired entries first
  for (const [key, entry] of promptCache.entries()) {
    if (now > entry.expiresAt) {
      promptCache.delete(key);
    }
  }

  // Evict oldest if at capacity (LRU)
  if (promptCache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of promptCache.entries()) {
      if (entry.cachedAt < oldestTime) {
        oldestTime = entry.cachedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      promptCache.delete(oldestKey);
    }
  }

  promptCache.set(hash, {
    hash,
    promptText,
    cachedAt: now,
    expiresAt: now + CACHE_TTL_MS,
    hitCount: 0,
  });

  return hash;
}

/**
 * Clears all cached prompts.
 * Use when changing models or resetting session state.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}

/**
 * Returns cache statistics for monitoring.
 */
export function getPromptCacheStats(): {
  size: number;
  totalHits: number;
  oldestAgeMs: number;
} {
  let totalHits = 0;
  let oldestAgeMs = 0;
  const now = Date.now();

  for (const entry of promptCache.values()) {
    totalHits += entry.hitCount;
    const age = now - entry.cachedAt;
    if (age > oldestAgeMs) {
      oldestAgeMs = age;
    }
  }

  return {
    size: promptCache.size,
    totalHits,
    oldestAgeMs,
  };
}
