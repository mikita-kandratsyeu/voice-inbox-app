/** Stable section markers for share/email markdown (parsed on web, ignored in plain share). */
export const SHARE_SPEAKER_TURNS_SECTION_MARKER = '<!-- vi:section:speaker-turns -->';

export const SHARE_SPEAKER_TURNS_SECTION_MARKER_RE =
  /<!--\s*vi:section:speaker-turns\s*-->\s*(?:\r?\n)?/i;

const SHARE_SECTION_MARKER_LINE_RE = /^\s*<!--\s*vi:section:[a-z0-9-]+\s*-->\s*\r?\n?/gim;
const SHARE_SECTION_MARKER_INLINE_RE = /<!--\s*vi:section:[a-z0-9-]+\s*-->/gi;

/** Removes inline `vi:section` markers from a single line or table cell. */
export function stripInlineShareSectionMarkers(text: string): string {
  return text
    .replace(SHARE_SECTION_MARKER_INLINE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function stripShareSectionMarkers(markdown: string): string {
  return markdown
    .replace(SHARE_SECTION_MARKER_LINE_RE, '')
    .replace(SHARE_SECTION_MARKER_INLINE_RE, '');
}
