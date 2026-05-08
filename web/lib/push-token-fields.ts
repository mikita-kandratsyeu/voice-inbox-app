import {
  PUSH_TOKEN_APP_VERSION_MAX_CHARS,
  PUSH_TOKEN_BUILD_NUMBER_MAX_CHARS,
  PUSH_TOKEN_OS_VERSION_MAX_CHARS,
} from '@/config/constants';

function sanitizePushMetaField(raw: unknown, maxChars: number): string | null {
  if (raw === undefined || raw === null) return null;
  const str =
    typeof raw === 'number' && Number.isFinite(raw)
      ? String(raw)
      : typeof raw === 'string'
        ? raw
        : null;
  if (str == null) return null;
  const trimmed = str.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const noCtl = trimmed.replace(/[\u0000-\u001F\u007F]/g, '');
  if (!noCtl) return null;
  return noCtl.length > maxChars ? noCtl.slice(0, maxChars) : noCtl;
}

export function sanitizeAppVersion(raw: unknown): string | null {
  return sanitizePushMetaField(raw, PUSH_TOKEN_APP_VERSION_MAX_CHARS);
}

export function sanitizeBuildNumber(raw: unknown): string | null {
  return sanitizePushMetaField(raw, PUSH_TOKEN_BUILD_NUMBER_MAX_CHARS);
}

export function sanitizeOsVersion(raw: unknown): string | null {
  return sanitizePushMetaField(raw, PUSH_TOKEN_OS_VERSION_MAX_CHARS);
}
