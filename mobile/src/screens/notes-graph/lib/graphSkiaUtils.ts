import { Skia, type SkPath } from '@shopify/react-native-skia';

const MAX_CACHE_SIZE = 4096;
const EVICTION_SIZE = 1024;

type CacheEntry = {
  path: SkPath;
  lastAccess: number;
};

const skiaPathCache = new Map<string, CacheEntry>();

function evictOldestEntries(): void {
  const entries = Array.from(skiaPathCache.entries());
  entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

  for (let i = 0; i < EVICTION_SIZE && i < entries.length; i++) {
    skiaPathCache.delete(entries[i][0]);
  }
}

export function getCachedSkiaPath(cacheKey: string, svgPath: string): SkPath | null {
  const cached = skiaPathCache.get(cacheKey);
  if (cached) {
    cached.lastAccess = Date.now();
    return cached.path;
  }

  const path = Skia.Path.MakeFromSVGString(svgPath);
  if (!path) return null;

  if (skiaPathCache.size >= MAX_CACHE_SIZE) {
    evictOldestEntries();
  }

  skiaPathCache.set(cacheKey, { path, lastAccess: Date.now() });
  return path;
}

export function clearGraphSkiaPathCache(): void {
  skiaPathCache.clear();
}
