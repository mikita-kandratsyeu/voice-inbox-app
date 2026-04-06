import { isNumber } from '@/shared/lib';
import { storage } from '@/shared/lib/async-storage/mmkv';

import { parseMobileModelManifestString } from './parseManifest';
import type { MobileModelManifest } from './types';

const KEYS = {
  body: 'mobile_model_manifest.body',
  etag: 'mobile_model_manifest.etag',
  fetchedAt: 'mobile_model_manifest.fetchedAt',
} as const;

export const MANIFEST_SOFT_TTL_MS = 60 * 60 * 1000;

let cachedManifest: MobileModelManifest | null = null;
let lastFetchedAt = 0;
let storedEtag: string | null = null;

function mmkvFetchedAtOrZero(raw: number | undefined): number {
  return isNumber(raw) && Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export function hydrateManifestCache(): void {
  if (cachedManifest) return;

  const raw = storage.getString(KEYS.body);

  if (!raw?.trim()) return;

  const parsed = parseMobileModelManifestString(raw);

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

export function getCachedManifest(): MobileModelManifest | null {
  return cachedManifest;
}

export function getLastFetchedAt(): number {
  return lastFetchedAt;
}

export function getStoredEtag(): string | null {
  return storedEtag;
}

export function isManifestFresh(ttlMs: number): boolean {
  return lastFetchedAt > 0 && Date.now() - lastFetchedAt < ttlMs;
}

export function persistManifest(
  manifest: MobileModelManifest,
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

export function applyNotModified304(fetchedAt: number): void {
  lastFetchedAt = fetchedAt;
  storage.set(KEYS.fetchedAt, fetchedAt);
}

export function applyFetchedOk(
  manifest: MobileModelManifest,
  etag: string | null,
  fetchedAt: number,
): void {
  cachedManifest = manifest;
  lastFetchedAt = fetchedAt;
  storedEtag = etag;
  persistManifest(manifest, etag, fetchedAt);
}
