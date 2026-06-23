import {
  createDefaultMobileBannerManifest,
  MOBILE_BANNER_MANIFEST_APP_CONFIG_KEY,
  parseMobileBannerManifestString,
  type MobileBannerManifest,
} from '@/lib/mobile-banner-manifest';
import { prisma } from '@/lib/prisma';

const STORE_CACHE_TTL_MS = 60_000;

let cachedManifest: MobileBannerManifest | null = null;
let cachedAt = 0;
let loadInFlight: Promise<MobileBannerManifest> | null = null;

export function invalidateMobileBannerManifestCache(): void {
  cachedManifest = null;
  cachedAt = 0;
  loadInFlight = null;
}

export async function getMobileBannerManifestRow(): Promise<string | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  try {
    const row = await prisma.appConfig.findUnique({
      where: { key: MOBILE_BANNER_MANIFEST_APP_CONFIG_KEY },
    });
    return row?.value?.trim() ? row.value : null;
  } catch (e) {
    console.error('[mobile-banner-manifest-store] read', e);
    return null;
  }
}

export async function upsertMobileBannerManifestJson(json: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: MOBILE_BANNER_MANIFEST_APP_CONFIG_KEY },
    create: { key: MOBILE_BANNER_MANIFEST_APP_CONFIG_KEY, value: json },
    update: { value: json },
  });
  invalidateMobileBannerManifestCache();
}

async function loadPublishedManifest(): Promise<MobileBannerManifest> {
  const raw = await getMobileBannerManifestRow();
  if (raw) {
    const parsed = parseMobileBannerManifestString(raw);
    if (parsed.ok) {
      return parsed.manifest;
    }
    console.error(
      '[mobile-banner-manifest-store] invalid stored manifest, using default:',
      parsed.error,
    );
  }
  return createDefaultMobileBannerManifest();
}

export async function resolvePublishedMobileBannerManifest(): Promise<{
  manifest: MobileBannerManifest;
  source: 'database' | 'default';
}> {
  const now = Date.now();
  if (cachedManifest && now - cachedAt < STORE_CACHE_TTL_MS) {
    return {
      manifest: cachedManifest,
      source: cachedManifest.revision > 0 ? 'database' : 'default',
    };
  }

  if (loadInFlight) {
    const manifest = await loadInFlight;
    return {
      manifest,
      source: manifest.revision > 0 ? 'database' : 'default',
    };
  }

  loadInFlight = loadPublishedManifest();
  try {
    const manifest = await loadInFlight;
    cachedManifest = manifest;
    cachedAt = Date.now();
    return {
      manifest,
      source: manifest.revision > 0 ? 'database' : 'default',
    };
  } finally {
    loadInFlight = null;
  }
}

export async function getMobileBannerManifestForAdmin(): Promise<{
  manifest: MobileBannerManifest;
  hasStoredCopy: boolean;
}> {
  const raw = await getMobileBannerManifestRow();
  if (raw) {
    const parsed = parseMobileBannerManifestString(raw);
    if (parsed.ok) {
      return { manifest: parsed.manifest, hasStoredCopy: true };
    }
    console.error(
      '[mobile-banner-manifest-store] invalid stored manifest for admin:',
      parsed.error,
    );
  }
  return { manifest: createDefaultMobileBannerManifest(), hasStoredCopy: false };
}
