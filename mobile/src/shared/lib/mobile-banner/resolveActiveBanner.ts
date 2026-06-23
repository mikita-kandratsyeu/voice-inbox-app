import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { storage } from '@/shared/lib/async-storage/mmkv';
import { DEFAULT_LOCALE, LOCALE_MAP } from '@/shared/lib/i18n/config';
import { isAppVersionAtLeast } from '@/shared/lib/model-manifest/versionCompare';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';

import { getCachedBannerManifest, hydrateBannerManifestCache } from './bannerCache';
import {
  MOBILE_BANNER_LOCALES,
  type MobileBanner,
  type MobileBannerConfig,
  type MobileBannerLocale,
  type MobileBannerLocaleContent,
} from './types';

const DISMISSED_IDS_KEY = 'mobile_banner_manifest.dismissedIds';

function readAppVersion(): string {
  try {
    return String(DeviceInfoModule.version ?? '').trim();
  } catch {
    return '';
  }
}

function readDismissedIds(): Set<string> {
  const raw = storage.getString(DISMISSED_IDS_KEY);
  if (!raw?.trim()) {
    return new Set();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((item): item is string => typeof item === 'string' && item.length > 0),
    );
  } catch {
    return new Set();
  }
}

function writeDismissedIds(ids: Set<string>): void {
  storage.set(DISMISSED_IDS_KEY, JSON.stringify([...ids]));
}

export function dismissMobileBanner(id: string): void {
  const trimmed = id.trim();
  if (!trimmed) return;

  const ids = readDismissedIds();
  ids.add(trimmed);
  writeDismissedIds(ids);
}

export function normalizeMobileBannerLocale(locale: string | undefined): MobileBannerLocale {
  const trimmed = locale?.trim() ?? '';
  if (!trimmed) {
    return DEFAULT_LOCALE;
  }

  const mapped = LOCALE_MAP[trimmed] ?? LOCALE_MAP[trimmed.split('-')[0]?.toLowerCase() ?? ''];
  return mapped === 'ru' ? 'ru' : 'en';
}

export function pickMobileBannerLocaleContent(
  locales: Record<MobileBannerLocale, MobileBannerLocaleContent>,
  locale: string | undefined,
): MobileBannerLocaleContent | null {
  const primary = normalizeMobileBannerLocale(locale);
  const order: MobileBannerLocale[] = primary === 'ru' ? ['ru', 'en'] : ['en', 'ru'];

  for (const candidate of order) {
    const content = locales[candidate];
    if (content.title.trim().length > 0 && content.body.trim().length > 0) {
      return content;
    }
  }

  for (const candidate of MOBILE_BANNER_LOCALES) {
    const content = locales[candidate];
    if (content.title.trim().length > 0 && content.body.trim().length > 0) {
      return content;
    }
  }

  return null;
}

function isPlatformEligible(platforms: MobileBanner['platforms']): boolean {
  if (IS_IOS) {
    return platforms.includes('ios');
  }
  if (IS_ANDROID) {
    return platforms.includes('android');
  }
  return false;
}

function isWithinSchedule(config: MobileBannerConfig, nowMs: number): boolean {
  if (config.startsAt) {
    const startsAtMs = Date.parse(config.startsAt);
    if (Number.isFinite(startsAtMs) && nowMs < startsAtMs) {
      return false;
    }
  }

  if (config.endsAt) {
    const endsAtMs = Date.parse(config.endsAt);
    if (Number.isFinite(endsAtMs) && nowMs > endsAtMs) {
      return false;
    }
  }

  return true;
}

function resolveBannerFromConfig(
  config: MobileBannerConfig,
  locale: string | undefined,
  nowMs: number,
): MobileBanner | null {
  if (!config.enabled) {
    return null;
  }

  if (!isPlatformEligible(config.platforms)) {
    return null;
  }

  if (!isWithinSchedule(config, nowMs)) {
    return null;
  }

  if (config.minAppVersion) {
    const currentVersion = readAppVersion();
    if (!currentVersion || !isAppVersionAtLeast(currentVersion, config.minAppVersion)) {
      return null;
    }
  }

  if (readDismissedIds().has(config.id)) {
    return null;
  }

  const content = pickMobileBannerLocaleContent(config.locales, locale);
  if (!content) {
    return null;
  }

  return {
    id: config.id,
    enabled: config.enabled,
    title: content.title,
    body: content.body,
    ctaLabel: content.ctaLabel,
    ctaUrl: config.ctaUrl,
    startsAt: config.startsAt,
    endsAt: config.endsAt,
    platforms: config.platforms,
    minAppVersion: config.minAppVersion,
    dismissible: config.dismissible,
  };
}

export function resolveActiveMobileBanner(
  locale?: string,
  nowMs: number = Date.now(),
): MobileBanner | null {
  hydrateBannerManifestCache();
  const manifest = getCachedBannerManifest();
  const config = manifest?.banner;

  if (!config) {
    return null;
  }

  return resolveBannerFromConfig(config, locale, nowMs);
}

export function clearDismissedMobileBannerIdsForTests(): void {
  storage.remove(DISMISSED_IDS_KEY);
}
