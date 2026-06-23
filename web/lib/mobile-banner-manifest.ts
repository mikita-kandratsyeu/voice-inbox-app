export const MOBILE_BANNER_MANIFEST_APP_CONFIG_KEY = 'MOBILE_BANNER_MANIFEST_JSON';

export const MOBILE_BANNER_LOCALES = ['en', 'ru'] as const;
export type MobileBannerLocale = (typeof MOBILE_BANNER_LOCALES)[number];

export type MobileBannerPlatform = 'ios' | 'android';

export type MobileBannerLocaleContent = {
  title: string;
  body: string;
  ctaLabel: string | null;
};

export type MobileBannerConfig = {
  id: string;
  enabled: boolean;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  platforms: MobileBannerPlatform[];
  minAppVersion: string | null;
  dismissible: boolean;
  locales: Record<MobileBannerLocale, MobileBannerLocaleContent>;
};

export type MobileBannerManifest = {
  schemaVersion: 2;
  revision: number;
  banner: MobileBannerConfig | null;
};

const PLATFORMS: Set<MobileBannerPlatform> = new Set(['ios', 'android']);

const MAX_ID_LENGTH = 128;
const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 500;
const MAX_CTA_LABEL_LENGTH = 40;
const MAX_CTA_URL_LENGTH = 2048;
const MAX_MIN_APP_VERSION_LENGTH = 32;

export function createEmptyLocaleContent(): MobileBannerLocaleContent {
  return {
    title: '',
    body: '',
    ctaLabel: null,
  };
}

export function createDefaultMobileBannerManifest(): MobileBannerManifest {
  return {
    schemaVersion: 2,
    revision: 0,
    banner: null,
  };
}

export function stringifyMobileBannerManifest(manifest: MobileBannerManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function isIsoDateString(value: string): boolean {
  const ms = Date.parse(value);
  return Number.isFinite(ms);
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

function parsePlatforms(raw: unknown): MobileBannerPlatform[] | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { error: 'platforms must be a non-empty array' };
  }

  const platforms: MobileBannerPlatform[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (typeof item !== 'string' || !PLATFORMS.has(item as MobileBannerPlatform)) {
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
  if (typeof raw !== 'string' || !isIsoDateString(raw)) {
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
  if (typeof raw !== 'string') {
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
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: `${fieldPrefix} must be an object` };
  }

  const item = raw as Record<string, unknown>;
  const title = item.title;
  const body = item.body;

  if (title !== undefined && title !== null && title !== '') {
    if (typeof title !== 'string' || title.trim().length < 1 || title.length > MAX_TITLE_LENGTH) {
      return { error: `${fieldPrefix}.title must be a non-empty string (max 120 chars) if set` };
    }
  } else if (body !== undefined && body !== null && body !== '') {
    return { error: `${fieldPrefix}.title is required when body is set` };
  }

  if (body !== undefined && body !== null && body !== '') {
    if (typeof body !== 'string' || body.trim().length < 1 || body.length > MAX_BODY_LENGTH) {
      return { error: `${fieldPrefix}.body must be a non-empty string (max 500 chars) if set` };
    }
  } else if (title !== undefined && title !== null && title !== '') {
    return { error: `${fieldPrefix}.body is required when title is set` };
  }

  const ctaLabel = parseOptionalString(
    item.ctaLabel,
    `${fieldPrefix}.ctaLabel`,
    MAX_CTA_LABEL_LENGTH,
  );
  if (ctaLabel && typeof ctaLabel === 'object' && 'error' in ctaLabel) return ctaLabel;

  const normalizedTitle = typeof title === 'string' ? title.trim() : '';
  const normalizedBody = typeof body === 'string' ? body.trim() : '';

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
  if (raw === undefined || raw === null) {
    return { error: 'banner.locales is required' };
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'banner.locales must be an object' };
  }

  const locales = raw as Record<string, unknown>;
  const next = {
    en: createEmptyLocaleContent(),
    ru: createEmptyLocaleContent(),
  } satisfies Record<MobileBannerLocale, MobileBannerLocaleContent>;

  for (const locale of MOBILE_BANNER_LOCALES) {
    const parsed = parseLocaleContent(locales[locale], `banner.locales.${locale}`);
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
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'banner must be an object or null' };
  }

  const b = raw as Record<string, unknown>;
  const id = b.id;
  const enabled = b.enabled;
  const dismissible = b.dismissible;

  if (typeof id !== 'string' || id.trim().length < 1 || id.length > MAX_ID_LENGTH) {
    return { error: 'banner.id must be a non-empty string (max 128 chars)' };
  }
  if (typeof enabled !== 'boolean') {
    return { error: 'banner.enabled must be a boolean' };
  }
  if (typeof dismissible !== 'boolean') {
    return { error: 'banner.dismissible must be a boolean' };
  }

  const ctaUrl = parseOptionalString(b.ctaUrl, 'banner.ctaUrl', MAX_CTA_URL_LENGTH);
  if (ctaUrl && typeof ctaUrl === 'object' && 'error' in ctaUrl) return ctaUrl;
  if (ctaUrl && !isAllowedCtaUrl(ctaUrl)) {
    return { error: 'banner.ctaUrl must be an https, mailto, or voiceinbox URL' };
  }

  const startsAt = parseOptionalIsoDate(b.startsAt, 'banner.startsAt');
  if (startsAt && typeof startsAt === 'object' && 'error' in startsAt) return startsAt;

  const endsAt = parseOptionalIsoDate(b.endsAt, 'banner.endsAt');
  if (endsAt && typeof endsAt === 'object' && 'error' in endsAt) return endsAt;

  if (startsAt && endsAt && Date.parse(startsAt) > Date.parse(endsAt)) {
    return { error: 'banner.startsAt must be before banner.endsAt' };
  }

  const platforms = parsePlatforms(b.platforms);
  if ('error' in platforms) return platforms;

  const minAppVersion = parseOptionalString(
    b.minAppVersion,
    'banner.minAppVersion',
    MAX_MIN_APP_VERSION_LENGTH,
  );
  if (minAppVersion && typeof minAppVersion === 'object' && 'error' in minAppVersion) {
    return minAppVersion;
  }

  let locales: Record<MobileBannerLocale, MobileBannerLocaleContent> | { error: string };
  if (b.locales !== undefined) {
    locales = parseLocales(b.locales);
  } else if (typeof b.title === 'string' && typeof b.body === 'string') {
    const ctaLabel = parseOptionalString(b.ctaLabel, 'banner.ctaLabel', MAX_CTA_LABEL_LENGTH);
    if (ctaLabel && typeof ctaLabel === 'object' && 'error' in ctaLabel) return ctaLabel;
    locales = {
      en: {
        title: b.title.trim(),
        body: b.body.trim(),
        ctaLabel,
      },
      ru: createEmptyLocaleContent(),
    };
  } else {
    return { error: 'banner.locales is required' };
  }
  if ('error' in locales) return locales;

  if (ctaUrl) {
    const hasCtaLabel = MOBILE_BANNER_LOCALES.some((locale) => Boolean(locales[locale].ctaLabel));
    if (!hasCtaLabel) {
      return { error: 'banner.ctaUrl requires at least one locale ctaLabel' };
    }
  }

  for (const locale of MOBILE_BANNER_LOCALES) {
    const content = locales[locale];
    if (content.ctaLabel && !ctaUrl) {
      return { error: `banner.locales.${locale}.ctaLabel requires banner.ctaUrl` };
    }
  }

  return {
    id: id.trim(),
    enabled,
    ctaUrl,
    startsAt,
    endsAt,
    platforms,
    minAppVersion,
    dismissible,
    locales,
  };
}

export type ParseMobileBannerManifestResult =
  | { ok: true; manifest: MobileBannerManifest }
  | { ok: false; error: string };

export function parseMobileBannerManifestJson(raw: unknown): ParseMobileBannerManifestResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Root must be a JSON object' };
  }

  const root = raw as Record<string, unknown>;
  const schemaVersion = root.schemaVersion;
  const revision = root.revision;

  if (schemaVersion !== 1 && schemaVersion !== 2) {
    return { ok: false, error: 'schemaVersion must be 1 or 2' };
  }
  if (
    typeof revision !== 'number' ||
    !Number.isInteger(revision) ||
    revision < 0 ||
    revision > 1_000_000
  ) {
    return { ok: false, error: 'revision must be an integer between 0 and 1000000' };
  }

  const banner = parseBannerConfig(root.banner);
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invalid JSON';
    return { ok: false, error: msg };
  }
  return parseMobileBannerManifestJson(parsed);
}

export function bannersEqual(a: MobileBannerConfig | null, b: MobileBannerConfig | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.id === b.id &&
    a.enabled === b.enabled &&
    a.ctaUrl === b.ctaUrl &&
    a.startsAt === b.startsAt &&
    a.endsAt === b.endsAt &&
    a.minAppVersion === b.minAppVersion &&
    a.dismissible === b.dismissible &&
    a.platforms.join(',') === b.platforms.join(',') &&
    JSON.stringify(a.locales) === JSON.stringify(b.locales)
  );
}
