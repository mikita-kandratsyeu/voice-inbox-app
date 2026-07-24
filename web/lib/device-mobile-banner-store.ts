import {
  bannersEqual,
  parseMobileBannerManifestJson,
  type MobileBannerConfig,
} from '@/lib/mobile-banner-manifest';
import { prisma } from '@/lib/prisma';

export type DeviceMobileBannerRecord = {
  deviceId: string;
  revision: number;
  banner: MobileBannerConfig;
  updatedAt: Date;
};

const LIST_DEFAULT_LIMIT = 100;

function parseStoredBannerJson(bannerJson: string): MobileBannerConfig | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bannerJson) as unknown;
  } catch {
    return null;
  }

  const result = parseMobileBannerManifestJson({
    schemaVersion: 2,
    revision: 0,
    banner: parsed,
  });
  if (!result.ok || !result.manifest.banner) {
    return null;
  }
  return result.manifest.banner;
}

function rowToRecord(row: {
  deviceId: string;
  revision: number;
  bannerJson: string;
  updatedAt: Date;
}): DeviceMobileBannerRecord | null {
  const banner = parseStoredBannerJson(row.bannerJson);
  if (!banner) {
    return null;
  }
  return {
    deviceId: row.deviceId,
    revision: row.revision,
    banner,
    updatedAt: row.updatedAt,
  };
}

export async function getDeviceMobileBanner(
  deviceId: string,
): Promise<DeviceMobileBannerRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    const row = await prisma.deviceMobileBanner.findUnique({
      where: { deviceId },
    });
    if (!row) return null;
    return rowToRecord(row);
  } catch (e) {
    console.error('[device-mobile-banner-store] get', e);
    return null;
  }
}

export async function listDeviceMobileBanners(
  limit: number = LIST_DEFAULT_LIMIT,
): Promise<DeviceMobileBannerRecord[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];

  const safeLimit = Math.min(Math.max(1, limit), 500);

  try {
    const rows = await prisma.deviceMobileBanner.findMany({
      orderBy: { updatedAt: 'desc' },
      take: safeLimit,
    });
    return rows
      .map((row) => rowToRecord(row))
      .filter((record): record is DeviceMobileBannerRecord => record !== null);
  } catch (e) {
    console.error('[device-mobile-banner-store] list', e);
    return [];
  }
}

export async function upsertDeviceMobileBanner(
  deviceId: string,
  banner: MobileBannerConfig | null,
): Promise<DeviceMobileBannerRecord | null> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (!banner) {
    await prisma.deviceMobileBanner.deleteMany({ where: { deviceId } });
    return null;
  }

  const existing = await prisma.deviceMobileBanner.findUnique({
    where: { deviceId },
    select: { revision: true, bannerJson: true },
  });

  const existingBanner = existing ? parseStoredBannerJson(existing.bannerJson) : null;
  const revision =
    existing && bannersEqual(existingBanner, banner)
      ? existing.revision
      : existing
        ? existing.revision + 1
        : 1;

  const bannerJson = JSON.stringify(banner);
  const row = await prisma.deviceMobileBanner.upsert({
    where: { deviceId },
    create: {
      deviceId,
      revision,
      bannerJson,
    },
    update: {
      revision,
      bannerJson,
    },
  });

  const record = rowToRecord(row);
  if (!record) {
    throw new Error('Failed to persist device banner');
  }
  return record;
}

export async function deleteDeviceMobileBanner(deviceId: string): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is not configured');
  }

  await prisma.deviceMobileBanner.deleteMany({ where: { deviceId } });
}
