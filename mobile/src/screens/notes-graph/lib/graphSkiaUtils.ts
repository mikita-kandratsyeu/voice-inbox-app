import { Skia, type SkPath } from '@shopify/react-native-skia';

const skiaPathCache = new Map<string, SkPath>();

export function getCachedSkiaPath(cacheKey: string, svgPath: string): SkPath | null {
  const cached = skiaPathCache.get(cacheKey);
  if (cached) return cached;

  const path = Skia.Path.MakeFromSVGString(svgPath);
  if (!path) return null;

  if (skiaPathCache.size > 4096) {
    skiaPathCache.clear();
  }

  skiaPathCache.set(cacheKey, path);
  return path;
}

export function clearGraphSkiaPathCache(): void {
  skiaPathCache.clear();
}
