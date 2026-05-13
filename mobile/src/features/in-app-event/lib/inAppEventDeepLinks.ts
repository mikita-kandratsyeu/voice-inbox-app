/**
 * App Store Connect In-App Event reference name: `update_1-1-0`.
 * Use this exact URL in the event’s “Event deep link” field.
 */
export const IN_APP_EVENT_DEEP_LINK_UPDATE_1_1_0 = 'voiceinbox://in-app-event/update_1-1-0';

const IN_APP_EVENT_HOST = 'in-app-event';

/**
 * Parses `voiceinbox://in-app-event/<eventId>` without relying on the global `URL` implementation,
 * which on Hermes/React Native can mis-parse custom schemes (empty host, pathname `/`).
 */
export function tryParseInAppEventDeepLink(rawUrl: string): string | null {
  const normalized = rawUrl.trim().replace(/\/+$/, '');

  const withAuthority = /^voiceinbox:\/\/([^/?#]+)\/([^/?#]+)$/.exec(normalized);
  if (withAuthority) {
    const host = withAuthority[1];
    const slug = decodeURIComponent(withAuthority[2]);
    if (host === IN_APP_EVENT_HOST && slug.length > 0) {
      return slug;
    }
  }

  const singleSlash = /^voiceinbox:\/([^/?#]+)\/([^/?#]+)$/.exec(normalized);
  if (singleSlash) {
    const host = singleSlash[1];
    const slug = decodeURIComponent(singleSlash[2]);
    if (host === IN_APP_EVENT_HOST && slug.length > 0) {
      return slug;
    }
  }

  return null;
}
