import { storage } from '@/shared/lib/async-storage/mmkv';

import { parseMobileBannerManifestString } from './parseManifest';
import type { MobileBannerManifest } from './types';

const KEYS = {
  body: 'mobile_banner_manifest.body',
  etag: 'mobile_banner_manifest.etag',
  fetchedAt: 'mobile_banner_manifest.fetchedAt',
} as const;

export const BANNER_SOFT_TTL_MS = 30 * 60 * 1000;

let cachedManifest: MobileBannerManifest | null = null;
let lastFetchedAt = 0;
let storedEtag: string | null = null;

function mmkvFetchedAtOrZero(raw: number | undefined): number {
  return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export function hydrateBannerManifestCache(): void {
  if (cachedManifest) return;

  const raw = storage.getString(KEYS.body);
  if (!raw?.trim()) return;

  const parsed = parseMobileBannerManifestString(raw);
  if (!parsed.ok) {
    storage.remove(KEYS.body);
    storage.remove(KEYS.etag);
    storage.remove(KEYS.fetchedAt);
    return;
  }

  cachedManifest = parsed.manifest;
  lastFetchedAt = mmkvFetchedAtOrZero(storage.getNumber(KEYS.fetchedAt));
  const tag = storage.getString(KEYS.etag);
  storedEtag = tag && tag.length > 0 ? tag : null;
}

export function getCachedBannerManifest(): MobileBannerManifest | null {
  return cachedManifest;
}

export function getBannerLastFetchedAt(): number {
  return lastFetchedAt;
}

export function getStoredBannerEtag(): string | null {
  return storedEtag;
}

export function isBannerManifestFresh(ttlMs: number): boolean {
  return lastFetchedAt > 0 && Date.now() - lastFetchedAt < ttlMs;
}

function persistManifest(
  manifest: MobileBannerManifest,
  etag: string | null,
  fetchedAt: number,
): void {
  storage.set(KEYS.body, JSON.stringify(manifest));

  if (etag) {
    storage.set(KEYS.etag, etag);
  } else {
    storage.remove(KEYS.etag);
  }

  storage.set(KEYS.fetchedAt, fetchedAt);
}

export function applyBannerNotModified304(fetchedAt: number): void {
  lastFetchedAt = fetchedAt;
  storage.set(KEYS.fetchedAt, fetchedAt);
}

export function applyBannerFetchedOk(
  manifest: MobileBannerManifest,
  etag: string | null,
  fetchedAt: number,
): void {
  cachedManifest = manifest;
  lastFetchedAt = fetchedAt;
  storedEtag = etag;
  persistManifest(manifest, etag, fetchedAt);
}

export function clearBannerCacheForTests(): void {
  cachedManifest = null;
  lastFetchedAt = 0;
  storedEtag = null;
  storage.remove(KEYS.body);
  storage.remove(KEYS.etag);
  storage.remove(KEYS.fetchedAt);
}

export function clearMobileBannerManifestCache(): void {
  clearBannerCacheForTests();
}
