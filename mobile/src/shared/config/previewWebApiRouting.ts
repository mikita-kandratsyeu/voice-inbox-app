/**
 * TEMPORARY: remove this module once preview/staging is folded into production WEB_API_URL.
 * Newer app builds (v2+, build 300+) route to PREVIEW_WEB_API_URL from Firebase Remote Config.
 */
export const PREVIEW_WEB_API_MIN_MAJOR_VERSION = 2;
export const PREVIEW_WEB_API_MIN_BUILD_NUMBER = 300;

export function parseAppVersionMajor(appVersion: string): number | null {
  const trimmed = appVersion.trim();
  const head = trimmed.split('.')[0] ?? '';
  const major = Number.parseInt(head, 10);

  return Number.isFinite(major) ? major : null;
}

export function parseBuildNumber(buildNumber: string): number | null {
  const trimmed = buildNumber.trim();
  const parsed = Number.parseInt(trimmed, 10);

  return Number.isFinite(parsed) ? parsed : null;
}

export function shouldUsePreviewWebApi(appVersion: string, buildNumber: string): boolean {
  const major = parseAppVersionMajor(appVersion);
  const build = parseBuildNumber(buildNumber);

  if (major == null || build == null) {
    return false;
  }

  return major >= PREVIEW_WEB_API_MIN_MAJOR_VERSION && build >= PREVIEW_WEB_API_MIN_BUILD_NUMBER;
}
