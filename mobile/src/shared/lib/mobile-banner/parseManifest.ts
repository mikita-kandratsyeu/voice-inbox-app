import { isBoolean, isNumber, isRecord, isString } from '@/shared/lib/type-guards';

import {
  MOBILE_BANNER_LOCALES,
  type MobileBannerConfig,
  type MobileBannerLocale,
  type MobileBannerLocaleContent,
  type MobileBannerManifest,
  type MobileBannerPlatform,
} from './types';

const PLATFORMS = new Set<MobileBannerPlatform>(['ios', 'android']);

function isIsoDateString(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function isAllowedCtaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'voiceinbox:') {
      return true;
    }
    if (parsed.protocol === 'mailto:') {
      const target = parsed.pathname.trim() || parsed.href.replace(/^mailto:/i, '').trim();
      return target.length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

export type ParseMobileBannerManifestResult =
  | { ok: true; manifest: MobileBannerManifest }
  | { ok: false; error: string };

function createEmptyLocaleContent(): MobileBannerLocaleContent {
  return { title: '', body: '', ctaLabel: null };
}

function parsePlatforms(raw: unknown): MobileBannerPlatform[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'platforms must be a non-empty array' };
  }

  const platforms: MobileBannerPlatform[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!isString(item) || !PLATFORMS.has(item as MobileBannerPlatform)) {
      return { error: `platforms[${i}] must be ios or android` };
    }
    const platform = item as MobileBannerPlatform;
    if (!platforms.includes(platform)) {
      platforms.push(platform);
    }
  }

  return platforms;
}

function parseOptionalIsoDate(raw: unknown, field: string): string | null | { error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  if (!isString(raw) || !isIsoDateString(raw)) {
    return { error: `${field} must be an ISO date string if set` };
  }
  return raw;
}

function parseOptionalString(
  raw: unknown,
  field: string,
  maxLength: number,
): string | null | { error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return null;
  }
  if (!isString(raw)) {
    return { error: `${field} must be a string if set` };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > maxLength) {
    return { error: `${field} must be at most ${maxLength} characters` };
  }
  return trimmed;
}

function parseLocaleContent(
  raw: unknown,
  fieldPrefix: string,
): MobileBannerLocaleContent | { error: string } {
  if (raw === undefined || raw === null) {
    return createEmptyLocaleContent();
  }
  if (!isRecord(raw)) {
    return { error: `${fieldPrefix} must be an object` };
  }

  const title = raw.title;
  const body = raw.body;

  if (title !== undefined && title !== null && title !== '') {
    if (!isString(title) || title.trim().length < 1 || title.length > 120) {
      return { error: `${fieldPrefix}.title must be a non-empty string if set` };
    }
  } else if (body !== undefined && body !== null && body !== '') {
    return { error: `${fieldPrefix}.title is required when body is set` };
  }

  if (body !== undefined && body !== null && body !== '') {
    if (!isString(body) || body.trim().length < 1 || body.length > 500) {
      return { error: `${fieldPrefix}.body must be a non-empty string if set` };
    }
  } else if (title !== undefined && title !== null && title !== '') {
    return { error: `${fieldPrefix}.body is required when title is set` };
  }

  const ctaLabel = parseOptionalString(raw.ctaLabel, `${fieldPrefix}.ctaLabel`, 40);
  if (ctaLabel && typeof ctaLabel === 'object' && 'error' in ctaLabel) return ctaLabel;

  const normalizedTitle = isString(title) ? title.trim() : '';
  const normalizedBody = isString(body) ? body.trim() : '';

  if (!normalizedTitle && !normalizedBody && !ctaLabel) {
    return createEmptyLocaleContent();
  }

  return {
    title: normalizedTitle,
    body: normalizedBody,
    ctaLabel,
  };
}

function parseLocales(
  raw: unknown,
): Record<MobileBannerLocale, MobileBannerLocaleContent> | { error: string } {
  if (!isRecord(raw)) {
    return { error: 'banner.locales must be an object' };
  }

  const next = {
    en: createEmptyLocaleContent(),
    ru: createEmptyLocaleContent(),
  } satisfies Record<MobileBannerLocale, MobileBannerLocaleContent>;

  for (const locale of MOBILE_BANNER_LOCALES) {
    const parsed = parseLocaleContent(raw[locale], `banner.locales.${locale}`);
    if ('error' in parsed) {
      return parsed;
    }
    next[locale] = parsed;
  }

  const hasContent = MOBILE_BANNER_LOCALES.some(
    (locale) => next[locale].title.length > 0 && next[locale].body.length > 0,
  );
  if (!hasContent) {
    return { error: 'banner.locales must include at least one locale with title and body' };
  }

  return next;
}

function parseBannerConfig(raw: unknown): MobileBannerConfig | null | { error: string } {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (!isRecord(raw)) {
    return { error: 'banner must be an object or null' };
  }

  if (!isString(raw.id) || raw.id.trim().length < 1 || raw.id.length > 128) {
    return { error: 'banner.id must be a non-empty string' };
  }
  if (!isBoolean(raw.enabled)) {
    return { error: 'banner.enabled must be a boolean' };
  }
  if (!isBoolean(raw.dismissible)) {
    return { error: 'banner.dismissible must be a boolean' };
  }

  const ctaUrl = parseOptionalString(raw.ctaUrl, 'banner.ctaUrl', 2048);
  if (ctaUrl && typeof ctaUrl === 'object' && 'error' in ctaUrl) return ctaUrl;
  if (ctaUrl && !isAllowedCtaUrl(ctaUrl)) {
    return { error: 'banner.ctaUrl must be an https, mailto, or voiceinbox URL' };
  }

  const startsAt = parseOptionalIsoDate(raw.startsAt, 'banner.startsAt');
  if (startsAt && typeof startsAt === 'object' && 'error' in startsAt) return startsAt;

  const endsAt = parseOptionalIsoDate(raw.endsAt, 'banner.endsAt');
  if (endsAt && typeof endsAt === 'object' && 'error' in endsAt) return endsAt;

  if (startsAt && endsAt && Date.parse(startsAt) > Date.parse(endsAt)) {
    return { error: 'banner.startsAt must be before banner.endsAt' };
  }

  const platforms = parsePlatforms(raw.platforms);
  if ('error' in platforms) return platforms;

  const minAppVersion = parseOptionalString(raw.minAppVersion, 'banner.minAppVersion', 32);
  if (minAppVersion && typeof minAppVersion === 'object' && 'error' in minAppVersion) {
    return minAppVersion;
  }

  let locales: Record<MobileBannerLocale, MobileBannerLocaleContent> | { error: string };
  if (raw.locales !== undefined) {
    locales = parseLocales(raw.locales);
  } else if (isString(raw.title) && isString(raw.body)) {
    const ctaLabel = parseOptionalString(raw.ctaLabel, 'banner.ctaLabel', 40);
    if (ctaLabel && typeof ctaLabel === 'object' && 'error' in ctaLabel) return ctaLabel;
    locales = {
      en: {
        title: raw.title.trim(),
        body: raw.body.trim(),
        ctaLabel,
      },
      ru: createEmptyLocaleContent(),
    };
  } else {
    return { error: 'banner.locales is required' };
  }
  if ('error' in locales) return locales;

  return {
    id: raw.id.trim(),
    enabled: raw.enabled,
    ctaUrl,
    startsAt,
    endsAt,
    platforms,
    minAppVersion,
    dismissible: raw.dismissible,
    locales,
  };
}

export function parseMobileBannerManifestJson(raw: unknown): ParseMobileBannerManifestResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'Root must be a JSON object' };
  }

  const schemaVersion = raw.schemaVersion;
  const revision = raw.revision;

  if (schemaVersion !== 1 && schemaVersion !== 2) {
    return { ok: false, error: 'schemaVersion must be 1 or 2' };
  }
  if (!isNumber(revision) || !Number.isInteger(revision) || revision < 0) {
    return { ok: false, error: 'revision must be a non-negative integer' };
  }

  const banner = parseBannerConfig(raw.banner);
  if (banner && 'error' in banner) {
    return { ok: false, error: banner.error };
  }

  return {
    ok: true,
    manifest: {
      schemaVersion: 2,
      revision,
      banner,
    },
  };
}

export function parseMobileBannerManifestString(jsonText: string): ParseMobileBannerManifestResult {
  try {
    return parseMobileBannerManifestJson(JSON.parse(jsonText) as unknown);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    return { ok: false, error: msg };
  }
}
